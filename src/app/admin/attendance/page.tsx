import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function markAttendance(formData: FormData) {
  "use server";
  const profile = await requireAdmin("manage_attendance");
  const admin = createAdminClient();
  const classId = String(formData.get("class_id") || "");
  if (profile.role === "teacher") {
    const { data: teacher } = await admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).single();
    if (!((teacher?.assigned_classes || []) as string[]).includes(classId)) return;
  }
  const entries = formData.getAll("entry") as string[]; // "studentId:status"
  const date = String(formData.get("date"));
  const rows = entries.filter((e) => e.includes(":")).map((e) => {
    const [student_id, status] = e.split(":");
    return { student_id, date, status };
  });
  if (rows.length) await admin.from("attendance").upsert(rows, { onConflict: "student_id,date" });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/attendance");
}

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireAdmin("manage_attendance");
  const sp = await searchParams;
  const date = sp.date || new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data: allClasses } = await admin.from("classes").select("*").order("name");
  const { data: teacher } = profile.role === "teacher"
    ? await admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).single()
    : { data: null };
  const assigned = profile.role === "teacher" ? ((teacher?.assigned_classes || []) as string[]) : null;
  const classes = assigned ? (allClasses || []).filter((c) => assigned.includes(c.id)) : allClasses;
  const classId = sp.class_id && (!assigned || assigned.includes(sp.class_id)) ? sp.class_id : classes?.[0]?.id;
  const { data: students } = await admin.from("students")
    .select("id, roll_no, profiles(full_name)").eq("class_id", classId).order("roll_no");
  const { data: marked } = await admin.from("attendance").select("*").eq("date", date);
  const markedMap = new Map((marked ?? []).map((m) => [m.student_id, m.status]));

  const summary = await admin.from("attendance").select("status");
  const totals = (summary.data || []).reduce((out, row) => { out[row.status] = (out[row.status] || 0) + 1; return out; }, {} as Record<string, number>);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark daily class attendance." />
      {profile.role === "super_admin" && <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Present", totals.present || 0, "text-emerald-600"], ["Absent", totals.absent || 0, "text-red-600"], ["Late", totals.late || 0, "text-amber-600"], ["Attendance Rate", total ? `${Math.round(((totals.present || 0) / total) * 100)}%` : "0%", "text-primary-600"]].map(([label, value, color]) => <div key={String(label)} className="card"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div></div>)}
      </div>}
      <form method="GET" className="card mb-6 flex flex-wrap items-end gap-4">
        <label className="block"><span className="label">Class</span>
          <select name="class_id" className="input" defaultValue={classId} onChange={undefined}>
            {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Date</span>
          <input type="date" name="date" defaultValue={date} className="input" /></label>
        <button className="btn-secondary">Load</button>
      </form>

      <form action={markAttendance} className="card">
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="class_id" value={classId} />
        <table className="table">
          <thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead>
          <tbody>
            {(students || []).map((s) => {
              const cur = markedMap.get(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.roll_no ?? "—"}</td>
                  <td className="font-medium">{s.profiles?.[0]?.full_name ?? "—"}</td>
                  <td>
                    <div className="flex gap-3">
                      {["present", "absent", "late", "leave"].map((st) => (
                        <label key={st} className="flex items-center gap-1 text-sm">
                          <input type="radio" name="entry" value={`${s.id}:${st}`} defaultChecked={cur === st}
                            className="accent-primary-600" /> <span className="capitalize">{st}</span>
                        </label>
                      ))}
                      {cur && <Badge color={cur === "present" ? "green" : cur === "absent" ? "red" : "amber"}>{cur}</Badge>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!students?.length && <p className="py-8 text-center text-slate-400">No students in this class.</p>}
        <button className="btn-primary mt-4">Save Attendance</button>
      </form>
    </>
  );
}
