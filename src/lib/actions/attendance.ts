"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireLogin, requireSuperAdmin } from "@/lib/auth";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function saveAttendance(formData: FormData) {
  const profile = await requireAdmin();
  if (profile.role !== "teacher") return;

  const admin = createAdminClient();
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || "");
  const backToForm = `/admin/attendance?date=${encodeURIComponent(date)}&class_id=${encodeURIComponent(classId)}`;
  if (!classId || !isValidDate(date)) {
    redirect(`/admin/attendance?error=invalid`);
  }

  const { data: teacher } = await admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).maybeSingle();
  const assignedClasses = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
  if (!assignedClasses.includes(classId)) redirect(`${backToForm}&error=class`);

  const [{ data: students }, { data: classRecord }] = await Promise.all([
    admin.from("students").select("id, admission_date").eq("class_id", classId).lte("admission_date", date),
    admin.from("classes").select("id").eq("id", classId).maybeSingle(),
  ]);
  if (!classRecord) redirect(`${backToForm}&error=class`);
  const submitted = new Map(formData.getAll("entry").map((entry) => {
    const [studentId, status] = String(entry).split(":");
    return [studentId, status] as const;
  }));
  const rows = (students || []).map((student) => ({
    student_id: student.id,
    date,
    status: submitted.get(student.id) === "absent" ? "absent" : "present",
    marked_by: profile.id,
    created_at: new Date().toISOString(),
  }));

  if (!rows.length) redirect(`${backToForm}&error=empty`);
  const { error } = await admin.from("attendance").upsert(rows, { onConflict: "student_id,date" });
  if (error) redirect(`${backToForm}&error=save`);
  revalidatePath("/admin/attendance");
  redirect(`${backToForm}&saved=1`);
}

export async function deleteAttendance(formData: FormData) {
  const actor = await requireLogin();
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || "");
  const backToForm = `/admin/attendance?date=${encodeURIComponent(date)}&class_id=${encodeURIComponent(classId)}`;
  if (!classId || !isValidDate(date)) redirect("/admin/attendance?error=invalid");

  const admin = createAdminClient();
  if (actor.role === "teacher") {
    const { data: teacher } = await admin.from("teachers").select("assigned_classes").eq("profile_id", actor.id).maybeSingle();
    const assignedClasses = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
    if (!assignedClasses.includes(classId)) redirect(`${backToForm}&error=class`);
  } else {
    await requireSuperAdmin();
  }

  const { data: students } = await admin.from("students").select("id").eq("class_id", classId);
  const studentIds = (students || []).map((student) => student.id);
  if (!studentIds.length) redirect(`${backToForm}&error=empty`);
  const { data: rows, error } = await admin.from("attendance")
    .select("id, marked_by, created_at")
    .eq("date", date)
    .in("student_id", studentIds);
  if (error || !rows?.length) redirect(`${backToForm}&error=delete`);

  if (actor.role === "teacher") {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const canDeleteWholeForm = rows.every((row) => row.marked_by === actor.id && new Date(row.created_at).getTime() >= cutoff);
    if (!canDeleteWholeForm) redirect(`${backToForm}&error=expired`);
  }

  const { error: deleteError } = await admin.from("attendance").delete().in("id", rows.map((row) => row.id));
  if (deleteError) redirect(`${backToForm}&error=delete`);
  revalidatePath("/admin/attendance");
  redirect(`${backToForm}&deleted=1`);
}