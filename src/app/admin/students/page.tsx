import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getProfile } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { updateProfileRecord } from "@/lib/actions/accounts";
import { ensureStudentRecords } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await getProfile();
  await requireAdmin("manage_students");
  const sp = await searchParams;
  const admin = createAdminClient();
  await ensureStudentRecords();
  const { data: students } = await admin.from("students")
    .select("*, profiles(full_name, username, is_active, phone), classes(name, section)")
    .order("admission_no");
  const profileIds = (students || []).map((student) => student.profile_id).filter((id): id is string => Boolean(id));
  const { data: profiles } = profileIds.length
    ? await admin.from("profiles").select("id, full_name, username, is_active, phone").in("id", profileIds)
    : { data: [] };
  const profileNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const studentName = (student: { profile_id?: string | null; profiles?: { full_name?: string } | Array<{ full_name?: string }> | null; admission_no?: string | null }) => {
    const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
    return profile?.full_name || profileNames.get(student.profile_id || "") || student.admission_no || "Unnamed student";
  };
  const { data: classes } = await admin.from("classes").select("*").order("name");
  const selectedStudent = (students || []).find((student) => student.id === sp.student_id);
  const selectedProfile = selectedStudent?.profile_id ? profileById.get(selectedStudent.profile_id) : null;

  return (
    <>
      <PageHeader title="Students" subtitle={`${students?.length ?? 0} enrolled students`} actions={
        <a href="/admin/users" className="btn-primary">➕ Create Student Account</a>
      } />
      {sp.error === "placement" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Choose a class and enter a valid roll number.</div>}
      {sp.error === "save" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Student details could not be saved.</div>}
      {sp.updated && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Student details updated.</div>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Adm. No</th><th>Name</th><th>Username</th><th>Class</th><th>Roll</th><th>Monthly Fee</th><th>Parent</th><th>Status</th></tr></thead>
          <tbody>
            {(students || []).map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.admission_no}</td>
                <td className="font-medium">{studentName(s)}</td>
                <td className="font-mono text-xs text-slate-400">@{s.profile_id ? profileById.get(s.profile_id)?.username : "—"}</td>
                <td>{s.classes ? `${s.classes.name} - ${s.classes.section}` : "—"}</td>
                <td>{s.roll_no ?? "—"}</td>
                <td>₹{Number(s.monthly_fee).toLocaleString()}</td>
                <td className="text-xs">{s.parent_name}<br /><span className="text-slate-400">{s.parent_phone}</span></td>
                <td><Badge color={profileById.get(s.profile_id || "")?.is_active ? "green" : "red"}>{profileById.get(s.profile_id || "")?.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!students?.length && <p className="py-10 text-center text-slate-400">No students yet. Create accounts from "Users & Accounts".</p>}
      </div>

      {me && <>
        <form method="GET" className="card mt-6 flex flex-wrap items-end gap-4">
          <label className="block"><span className="label">Student to edit</span>
            <select name="student_id" className="input" defaultValue={sp.student_id || ""} required>
              <option value="" disabled>Select a student</option>
              {(students || []).filter((student) => student.profile_id).map((student) => <option key={student.id} value={student.id}>{student.admission_no} — {studentName(student)}</option>)}
            </select>
          </label>
          <button className="btn-secondary">Load</button>
        </form>
        {selectedStudent?.profile_id && <div className="card mt-6">
          <h2 className="card-title">✏️ Edit Student Details</h2>
          <form action={updateProfileRecord} className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <input type="hidden" name="role" value="student" />
            <input type="hidden" name="user_id" value={selectedStudent.profile_id} />
            <input type="hidden" name="record_id" value={selectedStudent.id} />
            <label className="block"><span className="label">Admission No.</span><input name="admission_no" className="input" defaultValue={selectedStudent.admission_no} required /></label>
            <label className="block"><span className="label">Full Name</span><input name="full_name" className="input" defaultValue={selectedProfile?.full_name || ""} required /></label>
            <label className="block"><span className="label">Phone</span><input name="phone" className="input" defaultValue={selectedProfile?.phone || ""} /></label>
            <label className="block"><span className="label">Class / Section</span>
              <select name="class_id" className="input" defaultValue={selectedStudent.class_id || ""} required>
                <option value="" disabled>Select class</option>
                {(classes || []).map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Roll No</span><input name="roll_no" type="number" min={1} className="input" defaultValue={selectedStudent.roll_no ?? ""} required /></label>
            <label className="block"><span className="label">DOB</span><input name="dob" type="date" className="input" defaultValue={selectedStudent.dob || ""} /></label>
            <label className="block"><span className="label">Parent Name</span><input name="parent_name" className="input" defaultValue={selectedStudent.parent_name || ""} /></label>
            <label className="block"><span className="label">Parent Phone</span><input name="parent_phone" className="input" defaultValue={selectedStudent.parent_phone || ""} /></label>
            <label className="block"><span className="label">Monthly Fee (₹)</span><input name="monthly_fee" type="number" step="0.01" className="input" defaultValue={selectedStudent.monthly_fee ?? 0} /></label>
            <label className="block"><span className="label">Address</span><input name="address" className="input" defaultValue={selectedStudent.address || ""} /></label>
            <label className="block"><span className="label">Admission Date</span><input name="admission_date" type="date" className="input" defaultValue={selectedStudent.admission_date || ""} /></label>
            <div className="flex items-end"><button className="btn-primary w-full">Save Changes</button></div>
          </form>
        </div>}
      </>}
    </>
  );
}
