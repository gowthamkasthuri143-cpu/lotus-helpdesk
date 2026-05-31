import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const currentUser = await getCurrentUser();
  const roleError = requireRole(currentUser, ["admin"]);
  if (roleError) return roleError;

  const { id } = await params;
  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = String(body.name).trim();
  if (body.user_id !== undefined) updates.user_id = String(body.user_id).trim();
  if (body.role !== undefined) updates.role = body.role;
  if (body.department_id !== undefined) updates.department_id = body.department_id || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.password) updates.password_hash = await bcrypt.hash(String(body.password), 10);

  const { data, error } = await supabaseAdmin
    .from("app_users")
    .update(updates)
    .eq("id", id)
    .select("id, name, user_id, role, department_id, phone, status, created_at, departments(department_name)")
    .single();

  if (error) return fail(error.message, 500);
  return ok({ user: data });
}

export async function DELETE(_request, { params }) {
  const currentUser = await getCurrentUser();
  const roleError = requireRole(currentUser, ["admin"]);
  if (roleError) return roleError;

  const { id } = await params;
  if (id === currentUser.id) return fail("You cannot delete your own login", 409);

  const { error } = await supabaseAdmin.from("app_users").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  return ok({ message: "User deleted" });
}
