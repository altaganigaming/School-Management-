"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function saveAttendance(formData: FormData) {
  const profile = await requireAdmin();
  if (profile.role !== "teacher") return;

  const admin = createAdminClient();
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || "");
  const backToForm = `/admin/attendance?date=${encodeURIComponent(date)}&class_id=${encodeURIComponent(classId)}`;
  if (!classId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    redirect(`/admin/attendance?error=invalid`);
  }

  const { data: teacher } = await admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).maybeSingle();
  const assignedClasses = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
  if (!assignedClasses.includes(classId)) redirect(`${backToForm}&error=class`);

  const [{ data: students }, { data: classRecord }] = await Promise.all([
    admin.from("students").select("id").eq("class_id", classId),
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
  }));

  if (!rows.length) redirect(`${backToForm}&error=empty`);
  const { error } = await admin.from("attendance").upsert(rows, { onConflict: "student_id,date" });
  if (error) redirect(`${backToForm}&error=save`);
  revalidatePath("/admin/attendance");
  redirect(`${backToForm}&saved=1`);
}