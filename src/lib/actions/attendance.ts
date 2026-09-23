"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function saveAttendance(formData: FormData) {
  const profile = await requireAdmin("manage_attendance");
  if (profile.role !== "super_admin") return;

  const admin = createAdminClient();
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || "");
  if (!classId || !date) return;

  const { data: students } = await admin.from("students").select("id").eq("class_id", classId);
  const validStudentIds = new Set((students || []).map((student) => student.id));
  const rows = formData.getAll("entry").flatMap((entry) => {
    const [studentId, status] = String(entry).split(":");
    return validStudentIds.has(studentId) && (status === "present" || status === "absent")
      ? [{ student_id: studentId, date, status, marked_by: profile.id }]
      : [];
  });

  if (rows.length) await admin.from("attendance").upsert(rows, { onConflict: "student_id,date" });
  revalidatePath("/admin/attendance");
}