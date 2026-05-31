import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";
import { getCurrentUser, requireRole } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin", "user", "technician"]);
  if (roleError) return roleError;

  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("id, department_name, floor, contact_person, phone, status, created_at")
    .order("department_name");

  if (error) return fail(error.message, 500);
  return ok({ departments: data || [] });
}

export async function POST(request) {
  const user = await getCurrentUser();
  const roleError = requireRole(user, ["admin"]);
  if (roleError) return roleError;

  const body = await request.json();
  const departmentName = String(body.department_name || "").trim();
  if (!departmentName) return fail("Department name required", 400);

  const { data, error } = await supabaseAdmin
    .from("departments")
    .insert({
      department_name: departmentName,
      floor: body.floor || null,
      contact_person: body.contact_person || null,
      phone: body.phone || null,
      status: body.status || "Active",
    })
    .select("id, department_name, floor, contact_person, phone, status, created_at")
    .single();

  if (error) return fail(error.message, 500);
  return ok({ department: data });
}
