import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureTeacherRecords() {
  const admin = createAdminClient();
  const [{ data: accounts }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("id, username").eq("role", "teacher"),
    admin.from("teachers").select("profile_id"),
  ]);
  const linkedIds = new Set((existing || []).map((teacher) => teacher.profile_id).filter(Boolean));
  const missing = (accounts || []).filter((account) => !linkedIds.has(account.id));
  if (missing.length) {
    await admin.from("teachers").upsert(
      missing.map((account) => ({ profile_id: account.id, employee_id: `LEGACY-${account.username}` })),
      { onConflict: "profile_id", ignoreDuplicates: true },
    );
  }
}

export async function ensureStudentRecords() {
  const admin = createAdminClient();
  const [{ data: accounts }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("id, username").eq("role", "student"),
    admin.from("students").select("profile_id"),
  ]);
  const linkedIds = new Set((existing || []).map((student) => student.profile_id).filter(Boolean));
  const missing = (accounts || []).filter((account) => !linkedIds.has(account.id));
  if (missing.length) {
    await admin.from("students").upsert(
      missing.map((account) => ({ profile_id: account.id, admission_no: `LEGACY-${account.username}` })),
      { onConflict: "profile_id", ignoreDuplicates: true },
    );
  }
}