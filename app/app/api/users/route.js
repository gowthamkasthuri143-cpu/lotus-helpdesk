import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "technician"]);
  if (roleError) return roleError;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  let query = supabaseAdmin
    .from("app_users")
    .select("id, name, user_id, role, department_id, phone, status, created_at, departments(department_name)")
    .order("created_at", { ascending: false });

  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  return ok({ users: data || [] });
}

export async function POST(request) {
  const currentUser = await getCurrentUser();
  const roleError = requireRole(currentUser, ["admin"]);
  if (roleError) return roleError;

  const body = await request.json();
  const name = String(body.name || "").trim();
  const userId = String(body.user_id || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "user");

  if (!name || !userId || !password) return fail("Name, User ID and password required", 400);
  if (!["admin", "user", "technician"].includes(role)) return fail("Invalid role", 400);

  const passwordHash = await bcrypt.hash(password, 10);
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .insert({
      name,
      user_id: userId,
      password_hash: passwordHash,
      role,
      department_id: body.department_id || null,
      phone: body.phone || null,
      status: body.status || "Active",
    })
    .select("id, name, user_id, role, department_id, phone, status, created_at, departments(department_name)")
    .single();

  if (error) return fail(error.message, 500);
  return ok({ user: data });
}
