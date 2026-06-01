import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const { id } = await params;
  const body = await request.json();
  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (body.department_name !== undefined) updates.department_name = String(body.department_name).trim();
  if (body.floor !== undefined) updates.floor = body.floor || null;
  if (body.contact_person !== undefined) updates.contact_person = body.contact_person || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .update(updates)
    .eq("id", id)
    .select("id, department_name, floor, contact_person, phone, status, created_at")
    .single();

  if (error) return fail(error.message, 500);
  return ok({ department: data });
}

export async function DELETE(_request, { params }) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const { id } = await params;
  const { count, error: countError } = await supabaseAdmin
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("department_id", id);

  if (countError) return fail(countError.message, 500);
  if ((count || 0) > 0) return fail("Tickets exist for this department. Rename or deactivate instead of delete.", 409);

  const { error } = await supabaseAdmin.from("departments").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  return ok({ message: "Department deleted" });
}
