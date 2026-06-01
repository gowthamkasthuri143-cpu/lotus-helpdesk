import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fail, ok } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request) {
  const setupSecret = process.env.SETUP_SECRET;
  const headerSecret = request.headers.get("x-setup-secret");

  if (!setupSecret || headerSecret !== setupSecret) {
    return fail("Invalid setup secret", 403);
  }

  const adminUserId = process.env.ADMIN_USER_ID || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminName = process.env.ADMIN_NAME || "IT Admin";

  const { data: itDepartment, error: deptError } = await supabaseAdmin
    .from("departments")
    .upsert({ department_name: "IT", status: "Active" }, { onConflict: "department_name" })
    .select("id, department_name")
    .single();

  if (deptError) return fail(deptError.message, 500);

  const { data: existingAdmin, error: findError } = await supabaseAdmin
    .from("app_users")
    .select("id")
    .eq("user_id", adminUserId)
    .maybeSingle();

  if (findError) return fail(findError.message, 500);
  if (existingAdmin) return ok({ message: "Admin already exists", adminUserId });

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const { error: userError } = await supabaseAdmin.from("app_users").insert({
    name: adminName,
    user_id: adminUserId,
    password_hash: passwordHash,
    role: "admin",
    department_id: itDepartment.id,
    status: "Active",
  });

  if (userError) return fail(userError.message, 500);

  return ok({ message: "Setup completed", adminUserId });
}
