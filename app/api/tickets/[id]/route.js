import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "technician"]);
  if (roleError) return roleError;

  const { id } = await params;
  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "Solved") updates.solved_at = new Date().toISOString();
    if (body.status === "Closed") updates.closed_at = new Date().toISOString();
  }
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to || null;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.admin_remark !== undefined) updates.admin_remark = body.admin_remark || null;

  const { data, error } = await supabaseAdmin
    .from("tickets")
    .update(updates)
    .eq("id", id)
    .select("id, ticket_number, status, priority, assigned_to, admin_remark, updated_at, solved_at, closed_at")
    .single();

  if (error) return fail(error.message, 500);

  if (body.comment || body.admin_remark || body.status) {
    await supabaseAdmin.from("ticket_comments").insert({
      ticket_id: id,
      user_id: user.id,
      comment: body.comment || body.admin_remark || `Status changed to ${body.status}`,
    });
  }

  return ok({ ticket: data });
}

export async function GET(_request, { params }) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "user", "technician"]);
  if (roleError) return roleError;

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select(`
      id, ticket_number, created_by, department_id, asset_name, asset_number,
      complaint_type, priority, description, status, assigned_to, admin_remark,
      created_at, updated_at, solved_at, closed_at,
      departments:departments!tickets_department_id_fkey(department_name),
      created_by_user:app_users!tickets_created_by_fkey(name, user_id),
      assigned_user:app_users!tickets_assigned_to_fkey(name, user_id),
      attachments(id, file_url, file_name, file_type, created_at),
      ticket_comments(id, comment, created_at, app_users(name, role))
    `)
    .eq("id", id)
    .single();

  if (error) return fail(error.message, 500);
  if (user.role === "user" && data.department_id !== user.departmentId) return fail("Permission denied", 403);
  if (user.role === "technician" && data.assigned_to !== user.id) return fail("Permission denied", 403);

  return ok({ ticket: data });
}
