import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function markAttendance(formData: FormData) {
  "use server";
  const admin = createAdminClient();
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
  await requireAdmin("manage_attendance");
  const sp = await searchParams;
  const date = sp.date || new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data: classes } = await admin.from("classes").select("*").order("name");
  const classId = sp.class_id || classes?.[0]?.id;
  const { data: students } = await admin.from("students")
    .select("id, roll_no, profiles(full_name)").eq("class_id", classId).order("roll_no");
  const { data: marked } = await admin.from("attendance").select("*").eq("date", date);
  const markedMap = new Map((marked ?? []).map((m) => [m.student_id, m.status]));

  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark daily class attendance." />
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
        <table className="table">
          <thead><tr><th>Roll</th><th>Student</th><th>Status</th></tr></thead>
          <tbody>
            {(students || []).map((s) => {
              const cur = markedMap.get(s.id);
              return (
                <tr key={s.id}>
                  <td>{s.roll_no ?? "—"}</td>
                  <td className="font-medium">{s.profiles?.full_name}</td>
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
