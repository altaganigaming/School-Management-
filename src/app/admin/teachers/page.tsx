import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { updateProfileRecord } from "@/lib/actions/accounts";
import { ensureTeacherRecords } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_faculty");
  const sp = await searchParams;
  const admin = createAdminClient();
  await ensureTeacherRecords();
  const { data: teachers } = await admin.from("teachers")
    .select("*, profiles(full_name, username, phone, is_active), subjects(name)")
    .order("employee_id");
  const { data: subjects } = await admin.from("subjects").select("*").order("name");
  const { data: classes } = await admin.from("classes").select("id, name, section").order("name");
  const selectedTeacher = (teachers || []).find((teacher) => teacher.profile_id === sp.teacher_id);
  const teacherProfile = (teacher: { profiles?: { full_name?: string; username?: string; phone?: string; is_active?: boolean } | Array<{ full_name?: string; username?: string; phone?: string; is_active?: boolean }> | null }) =>
    Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;

  return (
    <>
      <PageHeader title="Teachers" subtitle="Faculty profiles, subjects and joining details." actions={
        <a href="/admin/users" className="btn-primary">➕ Create Teacher Account</a>
      } />
      {sp.updated && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Teacher details updated.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "classes" ? "One or more selected classes no longer exist. Reload and choose valid classes." : "Teacher details could not be saved."}</div>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Emp. ID</th><th>Name</th><th>Subject</th><th>Qualification</th><th>Joining</th><th>Contact</th><th>Status</th></tr></thead>
          <tbody>
            {(teachers || []).map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs">{t.employee_id?.startsWith("LEGACY-") ? "—" : t.employee_id}</td>
                <td className="font-medium">{teacherProfile(t)?.full_name}</td>
                <td><Badge color="blue">{t.subjects?.name || "—"}</Badge></td>
                <td className="text-xs">{t.qualification}</td>
                <td className="text-xs">{t.joining_date || "—"}</td>
                <td className="text-xs">{teacherProfile(t)?.phone || "—"}</td>
                <td><Badge color={teacherProfile(t)?.is_active ? "green" : "red"}>{teacherProfile(t)?.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!teachers?.length && <p className="py-10 text-center text-slate-400">No teachers yet.</p>}
      </div>
      <form method="GET" className="card mt-6 flex flex-wrap items-end gap-4">
        <label className="block"><span className="label">Teacher to edit</span>
          <select name="teacher_id" className="input" defaultValue={sp.teacher_id || ""} required>
            <option value="" disabled>Select a teacher</option>
            {(teachers || []).map((teacher) => <option key={teacher.id} value={teacher.profile_id || ""}>{teacherProfile(teacher)?.full_name || "Name unavailable"}</option>)}
          </select>
        </label>
        <button className="btn-secondary">Load</button>
      </form>
      {selectedTeacher && <div className="card mt-6">
        <h2 className="card-title">✏️ Edit Teacher Details</h2>
        <form action={updateProfileRecord} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="role" value="teacher" />
          <input type="hidden" name="user_id" value={selectedTeacher.profile_id} />
          <label className="block"><span className="label">Employee ID</span><input name="employee_id" className="input" defaultValue={selectedTeacher.employee_id} required /></label>
          <label className="block"><span className="label">Full Name</span><input name="full_name" className="input" defaultValue={teacherProfile(selectedTeacher)?.full_name || ""} required /></label>
          <label className="block"><span className="label">Phone</span><input name="phone" className="input" defaultValue={teacherProfile(selectedTeacher)?.phone || ""} /></label>
          <label className="block"><span className="label">Qualification</span><input name="qualification" className="input" defaultValue={selectedTeacher.qualification || ""} /></label>
          <label className="block"><span className="label">Subject</span>
            <select name="subject_id" className="input" defaultValue={selectedTeacher.subject_id || ""}><option value="">—</option>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Joining Date</span><input name="joining_date" type="date" className="input" defaultValue={selectedTeacher.joining_date || ""} /></label>
          <label className="block sm:col-span-2"><span className="label">Assigned Classes</span>
            <input type="hidden" name="assigned_classes" value="" />
            <select name="assigned_classes" className="input" multiple size={4} defaultValue={((selectedTeacher.assigned_classes || []) as string[]).map(String)}>
              {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
            </select>
            <span className="text-xs text-slate-400">Ctrl/Cmd se multiple classes select kar sakte hain.</span>
          </label>
          <div className="flex items-end"><button className="btn-primary w-full">Save Changes</button></div>
        </form>
      </div>}
    </>
  );
}
