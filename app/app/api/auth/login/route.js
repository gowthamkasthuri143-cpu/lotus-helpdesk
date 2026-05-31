import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail } from "@/lib/api";
import { setSessionCookie, signSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await request.json();
  const userId = String(body.userId || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "user");

  if (!userId || !password) return fail("User ID and password required", 400);

  const { data: user, error } = await supabaseAdmin
    .from("app_users")
    .select("id, name, user_id, password_hash, role, department_id, status, departments(department_name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!user || user.status !== "Active" || user.role !== role) return fail("Invalid login", 401);

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) return fail("Invalid login", 401);

  const sessionUser = {
    id: user.id,
    name: user.name,
    user_id: user.user_id,
    role: user.role,
    department_id: user.department_id,
    department_name: user.departments?.department_name || null,
  };

  const token = signSession(sessionUser);
  const response = NextResponse.json({ user: {
    id: sessionUser.id,
    name: sessionUser.name,
    userId: sessionUser.user_id,
    role: sessionUser.role,
    departmentId: sessionUser.department_id,
    departmentName: sessionUser.department_name,
  }});
  setSessionCookie(response, token);
  return response;
}
