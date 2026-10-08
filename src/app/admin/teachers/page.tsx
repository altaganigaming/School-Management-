import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { updateProfileRecord } from "@/lib/actions/accounts";
import { ensureTeacherRecords } from "@/lib/admin-records";
import { PhotoViewer } from "@/components/photo-viewer";

export const dynamic = "force-dynamic";

export default async function TeachersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin("manage_faculty");
  const sp = await searchParams;
  const admin = createAdminClient();
  await ensureTeacherRecords();
  const { data: teachers } = await admin.from("teachers")
    .select("*, profiles(full_name, username, phone, is_active, avatar_url, self_editable_fields), subjects(name)")
    .order("employee_id");
  const { data: subjects } = await admin.from("subjects").select("*").order("name");
  const { data: classes } = await admin.from("classes").select("id, name, section").order("name");
  const subjectNames = new Map((subjects || []).map((subject) => [subject.id, subject.name]));
  const selectedTeacher = (teachers || []).find((teacher) => teacher.profile_id === sp.teacher_id);
  const teacherProfile = (teacher: { profiles?: { full_name?: string; username?: string; phone?: string; is_active?: boolean; avatar_url?: string | null; self_editable_fields?: string[] } | Array<{ full_name?: string; username?: string; phone?: string; is_active?: boolean; avatar_url?: string | null; self_editable_fields?: string[] }> | null }) =>
    Array.isArray(teacher.profiles) ? teacher.profiles[0] : teacher.profiles;
  const teacherSubjectNames = (teacher: { assigned_subjects?: unknown; subject_id?: string | null; subjects?: { name?: string } | null }) => {
    const assigned = Array.isArray(teacher.assigned_subjects) ? teacher.assigned_subjects.map(String) : teacher.subject_id ? [teacher.subject_id] : [];
    const names = assigned.map((id) => subjectNames.get(id)).filter((name): name is string => Boolean(name));
    return names.length ? names.join(", ") : teacher.subjects?.name || "—";
  };

  return (
    <>
      <PageHeader title="Teachers" subtitle="Faculty profiles, subjects and joining details." actions={
        <a href="/admin/users" className="btn-primary">➕ Create Teacher Account</a>
      } />
      {sp.updated && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Teacher details updated.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "classes" ? "One or more selected classes no longer exist. Reload and choose valid classes." : sp.error === "avatar" ? "Faculty image must be an image under 5 MB and upload successfully." : "Teacher details could not be saved."}</div>}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Emp. ID</th><th>Name</th><th>Subject</th><th>Qualification</th><th>Joining</th><th>Contact</th><th>Status</th></tr></thead>
          <tbody>
            {(teachers || []).map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs">{t.employee_id?.startsWith("LEGACY-") ? "—" : t.employee_id}</td>
                <td className="font-medium">{teacherProfile(t)?.full_name}</td>
                <td><Badge color="blue">{teacherSubjectNames(t)}</Badge></td>
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
        <form action={updateProfileRecord} encType="multipart/form-data" className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="role" value="teacher" />
          <input type="hidden" name="user_id" value={selectedTeacher.profile_id} />
          {me.role === "super_admin" && <input type="hidden" name="self_editable_fields_present" value="1" />}
          <label className="block"><span className="label">Employee ID</span><input name="employee_id" className="input" defaultValue={selectedTeacher.employee_id} required /></label>
          <label className="block"><span className="label">Full Name</span><input name="full_name" className="input" defaultValue={teacherProfile(selectedTeacher)?.full_name || ""} required /></label>
          <label className="block"><span className="label">Phone</span><input name="phone" className="input" defaultValue={teacherProfile(selectedTeacher)?.phone || ""} /></label>
          <div className="block"><span className="label">Faculty Photo</span>
            <input name="avatar" type="file" accept="image/*" className="input" />
            <p className="mt-1 text-xs text-slate-400">Upload an image up to 5 MB for the homepage faculty section.</p>
            {teacherProfile(selectedTeacher)?.avatar_url && <label className="mt-2 flex items-center gap-2 text-xs text-red-600"><input type="checkbox" name="remove_avatar" value="true" className="h-4 w-4" />Remove current photo</label>}
          </div>
          {me.role === "super_admin" && <fieldset className="block rounded-lg border border-slate-200 p-3 sm:col-span-2">
            <legend className="label px-1">Teacher may edit in their profile</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {[{ key: "full_name", label: "Full name" }, { key: "phone", label: "Phone" }].map((field) => (
                <label key={field.key} className="flex items-center gap-2"><input type="checkbox" name="self_editable_fields" value={field.key} defaultChecked={teacherProfile(selectedTeacher)?.self_editable_fields?.includes(field.key) ?? field.key === "phone"} className="h-4 w-4" />{field.label}</label>
              ))}
            </div>
          </fieldset>}
          {teacherProfile(selectedTeacher)?.avatar_url && <PhotoViewer src={teacherProfile(selectedTeacher)!.avatar_url!} alt={teacherProfile(selectedTeacher)?.full_name || "Faculty member"} className="h-20 w-20 rounded-full" imageClassName="h-full w-full rounded-full object-cover" />}
          <label className="block"><span className="label">Qualification</span><input name="qualification" className="input" defaultValue={selectedTeacher.qualification || ""} /></label>
          <label className="block"><span className="label">Subjects</span>
            <input type="hidden" name="assigned_subjects" value="" />
            <select name="assigned_subjects" className="input" multiple size={4} defaultValue={Array.isArray(selectedTeacher.assigned_subjects) && selectedTeacher.assigned_subjects.length ? selectedTeacher.assigned_subjects.map(String) : selectedTeacher.subject_id ? [selectedTeacher.subject_id] : []}>
              {(subjects || []).map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Joining Date</span><input name="joining_date" type="date" className="input" defaultValue={selectedTeacher.joining_date || ""} /></label>
          <div className="block sm:col-span-2"><span className="label">Assigned Classes / Sections</span>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              <input type="hidden" name="assigned_classes" value="" />
              {(classes || []).map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_classes" value={item.id} defaultChecked={((selectedTeacher.assigned_classes || []) as string[]).map(String).includes(item.id)} className="h-4 w-4" />{item.name} - {item.section}</label>)}
            </div>
          </div>
          <div className="block sm:col-span-2"><span className="label">Assigned Subjects</span>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              <input type="hidden" name="assigned_subjects" value="" />
              {(subjects || []).map((subject) => {
                const currentSubjects = Array.isArray(selectedTeacher.assigned_subjects) && selectedTeacher.assigned_subjects.length
                  ? selectedTeacher.assigned_subjects.map(String)
                  : selectedTeacher.subject_id ? [selectedTeacher.subject_id] : [];
                return <label key={subject.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_subjects" value={subject.id} defaultChecked={currentSubjects.includes(subject.id)} className="h-4 w-4" />{subject.name}</label>;
              })}
            </div>
          </div>
          <div className="flex items-end"><button className="btn-primary w-full">Save Changes</button></div>
        </form>
      </div>}
    </>
  );
}
