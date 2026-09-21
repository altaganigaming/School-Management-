import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getProfile } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { updateProfileRecord } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const me = await getProfile();
  await requireAdmin("manage_students");
  const admin = createAdminClient();
  const { data: students } = await admin.from("students")
    .select("*, profiles(full_name, username, is_active, phone), classes(name, section)")
    .order("admission_no");
  const { data: classes } = await admin.from("classes").select("*").order("name");

  return (
    <>
      <PageHeader title="Students" subtitle={`${students?.length ?? 0} enrolled students`} actions={
        <a href="/admin/users" className="btn-primary">➕ Create Student Account</a>
      } />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Adm. No</th><th>Name</th><th>Username</th><th>Class</th><th>Roll</th><th>Monthly Fee</th><th>Parent</th><th>Status</th></tr></thead>
          <tbody>
            {(students || []).map((s) => (
              <tr key={s.id}>
                <td className="font-mono text-xs">{s.admission_no}</td>
                <td className="font-medium">{s.profiles?.full_name}</td>
                <td className="font-mono text-xs text-slate-400">@{s.profiles?.username}</td>
                <td>{s.classes ? `${s.classes.name} - ${s.classes.section}` : "—"}</td>
                <td>{s.roll_no ?? "—"}</td>
                <td>₹{Number(s.monthly_fee).toLocaleString()}</td>
                <td className="text-xs">{s.parent_name}<br /><span className="text-slate-400">{s.parent_phone}</span></td>
                <td><Badge color={s.profiles?.is_active ? "green" : "red"}>{s.profiles?.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!students?.length && <p className="py-10 text-center text-slate-400">No students yet. Create accounts from "Users & Accounts".</p>}
      </div>

      {/* EDIT PANEL (admins only; uses server-side permission checks in the action) */}
      {me && (
        <div className="card mt-6">
          <h2 className="card-title">✏️ Edit Student Details</h2>
          <form action={updateProfileRecord} className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <input type="hidden" name="role" value="student" />
            <label className="block"><span className="label">Student</span>
              <select name="user_id" className="input" required>
                {(students || []).map((s) => <option key={s.profile_id} value={s.profile_id}>{s.admission_no} — {s.profiles?.full_name}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Full Name</span><input name="full_name" className="input" /></label>
            <label className="block"><span className="label">Class</span>
              <select name="class_id" className="input"><option value="">—</option>
                {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Roll No</span><input name="roll_no" type="number" className="input" /></label>
            <label className="block"><span className="label">DOB</span><input name="dob" type="date" className="input" /></label>
            <label className="block"><span className="label">Parent Name</span><input name="parent_name" className="input" /></label>
            <label className="block"><span className="label">Parent Phone</span><input name="parent_phone" className="input" /></label>
            <label className="block"><span className="label">Monthly Fee (₹)</span><input name="monthly_fee" type="number" step="0.01" className="input" /></label>
            <label className="block"><span className="label">Address</span><input name="address" className="input" /></label>
            <label className="block"><span className="label">Admission Date</span><input name="admission_date" type="date" className="input" /></label>
            <div className="flex items-end"><button className="btn-primary w-full">Save Changes</button></div>
          </form>
        </div>
      )}
    </>
  );
}
