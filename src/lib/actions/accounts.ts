"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSuperAdmin, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/utils";
import type { Role } from "@/lib/permissions";

async function assertCanManage(targetRole: Role, permission: string) {
  const me = await requireAdmin(permission);
  if (me.role !== "super_admin" && targetRole !== "student") {
    redirect("/admin?denied=1"); // only Principal manages faculty/staff
  }
  return me;
}

export async function createAccount(formData: FormData) {
  const role = String(formData.get("role")) as Role;
  const permission = role === "student" ? "manage_students" : "manage_faculty";
  const me = await assertCanManage(role, permission);

  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  if (!username || !password || !fullName) redirect("/admin/users?error=missing");

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role },
  });
  if (error || !created.user) redirect("/admin/users?error=exists");

  const userId = created.user.id;
  await admin.from("profiles").update({ role, is_active: true }).eq("id", userId);

  if (role === "student") {
    await admin.from("students").insert({
      profile_id: userId,
      admission_no: String(formData.get("admission_no") || ""),
      class_id: String(formData.get("class_id") || "") || null,
      roll_no: Number(formData.get("roll_no") || 0) || null,
      dob: String(formData.get("dob") || "") || null,
      parent_name: String(formData.get("parent_name") || ""),
      parent_phone: String(formData.get("parent_phone") || ""),
      address: String(formData.get("address") || ""),
      monthly_fee: Number(formData.get("monthly_fee") || 0),
      admission_date: String(formData.get("admission_date") || new Date().toISOString().slice(0, 10)),
    });
  } else if (role === "teacher") {
    await admin.from("teachers").insert({
      profile_id: userId,
      employee_id: String(formData.get("employee_id") || ""),
      qualification: String(formData.get("qualification") || ""),
      subject_id: String(formData.get("subject_id") || "") || null,
      joining_date: String(formData.get("joining_date") || "") || null,
      address: String(formData.get("address") || ""),
    });
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${username}`);
}

export async function updateProfileRecord(formData: FormData) {
  const role = String(formData.get("role")) as Role;
  const permission = role === "student" ? "manage_students" : "manage_faculty";
  await assertCanManage(role, permission);
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  const table = role === "student" ? "students" : role === "teacher" ? "teachers" : null;

  await admin.from("profiles").update({
    full_name: String(formData.get("full_name") || ""),
    phone: String(formData.get("phone") || ""),
  }).eq("id", userId);

  if (table) {
    const payload: Record<string, any> = {};
    for (const key of ["admission_no","class_id","roll_no","dob","parent_name","parent_phone","address","monthly_fee","admission_date","employee_id","qualification","subject_id","joining_date"]) {
      if (formData.has(key)) {
        const v = formData.get(key);
        payload[key] = v === "" ? null : key === "roll_no" || key === "monthly_fee" ? Number(v) : v;
      }
    }
    await admin.from(table).update(payload).eq("profile_id", userId);
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

export async function toggleAccount(formData: FormData) {
  const targetRole = String(formData.get("role")) as Role;
  await assertCanManage(targetRole, targetRole === "student" ? "manage_students" : "manage_faculty");
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  const active = formData.get("active") === "true";
  await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (!active) await admin.auth.admin.signOut(userId, "global");
  revalidatePath("/admin/users");
}

export async function resetPassword(formData: FormData) {
  const targetRole = String(formData.get("role")) as Role;
  await assertCanManage(targetRole, targetRole === "student" ? "manage_students" : "manage_faculty");
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  await admin.auth.admin.updateUserById(userId, { password: String(formData.get("password")) });
  redirect("/admin/users?reset=1");
}

export async function updatePermissions(formData: FormData) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  const perms = formData.getAll("permissions").map(String);
  await admin.from("profiles").update({ permissions: perms }).eq("id", userId);
  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}

export async function deleteAccount(formData: FormData) {
  await requireSuperAdmin(); // only Principal can permanently delete
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}

export async function changeMyPassword(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.updateUser({ password: String(formData.get("password")) });
  redirect("/admin/settings?pw=1");
}

export async function saveSettings(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const keys = formData.getAll("key").map(String);
  for (const key of keys) {
    const raw = formData.get(`value:${key}`) as string;
    let value: any = raw;
    if (key === "facilities") {
      value = raw.split("\n").map((f) => f.trim()).filter(Boolean);
    } else if (key.startsWith("contact.")) {
      const sub = key.slice(8);
      const { data } = await supabase.from("school_settings").select("value").eq("key", "contact").single();
      const contact = { ...(data?.value || {}), [sub]: raw };
      await supabase.from("school_settings").upsert({ key: "contact", value: contact });
      continue;
    } else {
      try { value = JSON.parse(raw); } catch { value = raw; }
    }
    await supabase.from("school_settings").upsert({ key, value });
  }
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}
