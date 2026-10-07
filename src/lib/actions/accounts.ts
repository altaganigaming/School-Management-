"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireSuperAdmin, getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/utils";
import type { Role } from "@/lib/permissions";
import { removeStoredFile } from "@/lib/storage";

async function assertCanManage(targetRole: Role, permission: string) {
  const me = await requireAdmin(permission);
  if (me.role !== "super_admin" && targetRole !== "student") {
    redirect("/admin?denied=1"); // only Principal manages faculty/staff
  }
  return me;
}

export async function createAccount(formData: FormData) {
  const roleValue = String(formData.get("role") || "");
  if (!(["student", "teacher", "staff"] as string[]).includes(roleValue)) redirect("/admin/users?error=missing");
  const role = roleValue as Role;
  const permission = role === "student" ? "manage_students" : "manage_faculty";
  await assertCanManage(role, permission);

  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const admissionNo = String(formData.get("admission_no") || "").trim();
  const employeeId = String(formData.get("employee_id") || "").trim();
  const classId = String(formData.get("class_id") || "");
  const rollNo = Number(formData.get("roll_no"));
  const assignedClasses = [...new Set(formData.getAll("assigned_classes").map(String).filter(Boolean))];
  const assignedSubjects = role === "teacher" ? [...new Set(formData.getAll("assigned_subjects").map(String).filter(Boolean))] : [];
  if (!username || !password || !fullName
    || (role === "student" && (!admissionNo || !classId || !Number.isInteger(rollNo) || rollNo < 1))
    || (role === "teacher" && (!employeeId || !assignedClasses.length))) redirect("/admin/users?error=missing");

  const selectedClassIds = role === "student" ? [classId] : role === "teacher" ? assignedClasses : [];
  if (selectedClassIds.length || assignedSubjects.length) {
    const admin = createAdminClient();
    const [{ data: classes }, { data: subjects }] = await Promise.all([
      selectedClassIds.length ? admin.from("classes").select("id").in("id", selectedClassIds) : Promise.resolve({ data: [] }),
      assignedSubjects.length ? admin.from("subjects").select("id").in("id", assignedSubjects) : Promise.resolve({ data: [] }),
    ]);
    if ((classes || []).length !== selectedClassIds.length || (subjects || []).length !== assignedSubjects.length) redirect("/admin/users?error=save");
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, full_name: fullName, role },
  });
  if (error || !created.user) redirect("/admin/users?error=exists");

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").update({ role, is_active: true, full_name: fullName }).eq("id", userId);
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    redirect("/admin/users?error=save");
  }

  if (role === "student") {
    const { error } = await admin.from("students").insert({
      profile_id: userId,
      admission_no: admissionNo,
      class_id: classId,
      roll_no: rollNo,
      dob: String(formData.get("dob") || "") || null,
      parent_name: String(formData.get("parent_name") || ""),
      parent_phone: String(formData.get("parent_phone") || ""),
      address: String(formData.get("address") || ""),
      monthly_fee: Number(formData.get("monthly_fee") || 0),
      admission_date: String(formData.get("admission_date") || new Date().toISOString().slice(0, 10)),
    });
    if (error) {
      await admin.auth.admin.deleteUser(userId);
      redirect(error.code === "23505" ? "/admin/users?error=exists" : "/admin/users?error=save");
    }
  } else if (role === "teacher") {
    const { error } = await admin.from("teachers").insert({
      profile_id: userId,
      employee_id: employeeId,
      qualification: String(formData.get("qualification") || ""),
      subject_id: assignedSubjects[0] || null,
      assigned_subjects: assignedSubjects,
      assigned_classes: assignedClasses,
      joining_date: String(formData.get("joining_date") || formData.get("admission_date") || "") || null,
      address: String(formData.get("address") || ""),
    });
    if (error) {
      await admin.auth.admin.deleteUser(userId);
      redirect(error.code === "23505" ? "/admin/users?error=exists" : "/admin/users?error=save");
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/salaries");
  revalidatePath("/admin/fees");
  redirect(`/admin/users?created=${username}`);
}

export async function updateProfileRecord(formData: FormData) {
  const role = String(formData.get("role")) as Role;
  if (role !== "student" && role !== "teacher") redirect("/admin?denied=1");
  const permission = role === "student" ? "manage_students" : "manage_faculty";
  await assertCanManage(role, permission);
  const admin = createAdminClient();
  const userId = String(formData.get("user_id"));
  const table = role === "student" ? "students" : role === "teacher" ? "teachers" : null;

  if (role === "teacher") {
    const avatar = formData.get("avatar");
    const shouldRemoveAvatar = formData.get("remove_avatar") === "true";
    if (avatar instanceof File && avatar.size > 0) {
      if (!avatar.type.startsWith("image/") || avatar.size > 5 * 1024 * 1024) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=avatar`);
      const extension = avatar.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const path = `faculty/${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("avatars").upload(path, avatar, { contentType: avatar.type });
      if (uploadError) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=avatar`);
      const avatarUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { data: currentProfile } = await admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      const { error: profileError } = await admin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId);
      if (profileError) {
        await admin.storage.from("avatars").remove([path]);
        redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=avatar`);
      }
      if (currentProfile?.avatar_url) await removeStoredFile(currentProfile.avatar_url);
    } else if (shouldRemoveAvatar) {
      const { data: currentProfile } = await admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
      const { error: profileError } = await admin.from("profiles").update({ avatar_url: null }).eq("id", userId);
      if (profileError) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=avatar`);
      if (currentProfile?.avatar_url && !(await removeStoredFile(currentProfile.avatar_url))) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=avatar`);
    }
  }

  const profileChanges: Record<string, string> = {};
  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  if (fullName) profileChanges.full_name = fullName;
  if (phone) profileChanges.phone = phone;
  if (Object.keys(profileChanges).length) {
    const { error } = await admin.from("profiles").update(profileChanges).eq("id", userId);
    if (error) redirect(`/admin/${role === "student" ? "students" : "teachers"}?error=save`);
  }

  if (table) {
    const payload: Record<string, any> = {};
    for (const key of ["admission_no","class_id","roll_no","dob","parent_name","parent_phone","address","monthly_fee","admission_date","employee_id","qualification","subject_id","joining_date"]) {
      if (formData.has(key)) {
        const v = formData.get(key);
        payload[key] = v === "" ? null : key === "roll_no" || key === "monthly_fee" ? Number(v) : v;
      }
    }
    if (role === "teacher") {
      const assignedClasses = [...new Set(formData.getAll("assigned_classes").map(String).filter(Boolean))];
      const assignedSubjects = [...new Set(formData.getAll("assigned_subjects").map(String).filter(Boolean))];
      if (assignedClasses.length) {
        const { data: classes } = await admin.from("classes").select("id").in("id", assignedClasses);
        if ((classes || []).length !== assignedClasses.length) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=classes`);
      }
      if (assignedSubjects.length) {
        const { data: subjects } = await admin.from("subjects").select("id").in("id", assignedSubjects);
        if ((subjects || []).length !== assignedSubjects.length) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=subjects`);
      }
      if (!String(payload.employee_id || "").trim()) redirect(`/admin/teachers?teacher_id=${encodeURIComponent(userId)}&error=save`);
      payload.assigned_classes = assignedClasses;
      payload.assigned_subjects = assignedSubjects;
      payload.subject_id = assignedSubjects[0] || null;
    }
    if (role === "student") {
      const { data: matchedClass } = payload.class_id
        ? await admin.from("classes").select("id").eq("id", payload.class_id).maybeSingle()
        : { data: null };
      if (!matchedClass || !Number.isInteger(payload.roll_no) || payload.roll_no < 1 || !payload.admission_no) redirect("/admin/students?error=placement");
    }
    const { error } = await admin.from(table).update(payload).eq("profile_id", userId);
    if (error) redirect(`/admin/${role === "student" ? "students" : "teachers"}?error=save`);
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/salaries");
  revalidatePath("/admin/fees");
  revalidatePath("/admin/attendance");
  const selectedRecord = String(formData.get("record_id") || "");
  redirect(role === "student"
    ? `/admin/students?student_id=${encodeURIComponent(selectedRecord)}&updated=1`
    : `/admin/teachers?teacher_id=${encodeURIComponent(userId)}&updated=1`);
}

export async function toggleAccount(formData: FormData) {
  const targetRole = String(formData.get("role")) as Role;
  if (targetRole === "super_admin") redirect("/admin/users?protected=1");
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
  const { data: profile } = await admin.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  if (profile?.avatar_url) await removeStoredFile(profile.avatar_url);
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
    const raw = key === "admission_enabled"
      ? (formData.getAll(`value:${key}`).includes("true") ? "true" : "false")
      : String(formData.get(`value:${key}`) || "");
    const media = formData.get(`file:${key}`) as File | null;
    const removeMedia = formData.getAll(`remove:${key}`).includes("true");
    const { data: currentSetting } = await supabase.from("school_settings").select("value").eq("key", key).maybeSingle();
    const previousUrl = typeof currentSetting?.value === "string" ? currentSetting.value : null;
    if (removeMedia) {
      await supabase.from("school_settings").upsert({ key, value: "" });
      if (previousUrl) await removeStoredFile(previousUrl);
      continue;
    }
    if (media && media.size > 0) {
      const admin = createAdminClient();
      const path = `website/${key}-${Date.now()}-${media.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const upload = await admin.storage.from("gallery").upload(path, media, { upsert: true });
      if (!upload.error) {
        const url = admin.storage.from("gallery").getPublicUrl(path).data.publicUrl;
        await supabase.from("school_settings").upsert({ key, value: url });
        if (previousUrl && previousUrl !== url) await removeStoredFile(previousUrl);
        continue;
      }
    }
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
    if (["logo_url", "hero_image", "favicon_url"].includes(key) && previousUrl && previousUrl !== raw) await removeStoredFile(previousUrl);
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
