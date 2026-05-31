import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, getYearTicketPrefix, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

function mapTicket(ticket) {
  return {
    ...ticket,
    departmentName: ticket.departments?.department_name || "-",
    createdByName: ticket.created_by_user?.name || "-",
    assignedToName: ticket.assigned_user?.name || "Unassigned",
    attachments: ticket.attachments || [],
  };
}

async function createTicketNumber() {
  const prefix = getYearTicketPrefix();
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select("ticket_number")
    .like("ticket_number", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const lastNumber = data?.[0]?.ticket_number;
  const next = lastNumber ? Number(lastNumber.split("-").pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function GET(request) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "user", "technician"]);
  if (roleError) return roleError;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  let query = supabaseAdmin
    .from("tickets")
    .select(`
      id, ticket_number, created_by, department_id, asset_name, asset_number,
      complaint_type, priority, description, status, assigned_to, admin_remark,
      created_at, updated_at, solved_at, closed_at,
      departments:departments!tickets_department_id_fkey(department_name),
      created_by_user:app_users!tickets_created_by_fkey(name, user_id),
      assigned_user:app_users!tickets_assigned_to_fkey(name, user_id),
      attachments(id, file_url, file_name, file_type, created_at)
    `)
    .order("created_at", { ascending: false });

  if (user.role === "user") query = query.eq("department_id", user.departmentId);
  if (user.role === "technician") query = query.eq("assigned_to", user.id);
  if (status && status !== "All") query = query.eq("status", status);
  if (date) {
    const start = `${date}T00:00:00.000Z`;
    const end = `${date}T23:59:59.999Z`;
    query = query.gte("created_at", start).lte("created_at", end);
  }

  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  return ok({ tickets: (data || []).map(mapTicket) });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "user"]);
  if (roleError) return roleError;

  const formData = await request.formData();
  const departmentId = String(formData.get("department_id") || user.departmentId || "");
  const complaintType = String(formData.get("complaint_type") || "").trim();
  const priority = String(formData.get("priority") || "Medium");
  const description = String(formData.get("description") || "").trim();

  if (!departmentId) return fail("Department required", 400);
  if (!complaintType) return fail("Complaint type required", 400);

  const ticketNumber = await createTicketNumber();
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from("tickets")
    .insert({
      ticket_number: ticketNumber,
      created_by: user.id,
      department_id: departmentId,
      asset_name: String(formData.get("asset_name") || "").trim() || null,
      asset_number: String(formData.get("asset_number") || "").trim() || null,
      complaint_type: complaintType,
      priority,
      description,
      status: "Pending",
    })
    .select("id, ticket_number")
    .single();

  if (ticketError) return fail(ticketError.message, 500);

  const files = formData.getAll("files").filter((file) => file && file.name && file.size > 0);
  const attachments = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `tickets/${ticketNumber}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("ticket-attachments")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) continue;

    const { data: publicData } = supabaseAdmin.storage
      .from("ticket-attachments")
      .getPublicUrl(path);

    const { data: attachment } = await supabaseAdmin
      .from("attachments")
      .insert({
        ticket_id: ticket.id,
        uploaded_by: user.id,
        file_url: publicData.publicUrl,
        file_name: file.name,
        file_type: file.type || null,
      })
      .select("id, file_url, file_name, file_type, created_at")
      .single();

    if (attachment) attachments.push(attachment);
  }

  await supabaseAdmin.from("ticket_comments").insert({
    ticket_id: ticket.id,
    user_id: user.id,
    comment: "Ticket created",
  });

  return ok({ ticket: { ...ticket, attachments }, message: "Ticket created" });
}
