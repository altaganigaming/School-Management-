import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { updateProfileRecord } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function TeachersPage() {
  await requireAdmin("manage_faculty");
  const admin = createAdminClient();
  const { data: teachers } = await admin.from("teachers")
    .select("*, profiles(full_name, username, phone, is_active), subjects(name)")
    .order("employee_id");
  const { data: subjects } = await admin.from("subjects").select("*").order("name");

  return (
    <>
      <PageHeader title="Teachers" subtitle="Faculty profiles, subjects and joining details." actions={
        <a href="/admin/users" className="btn-primary">➕ Create Teacher Account</a>
      } />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Emp. ID</th><th>Name</th><th>Subject</th><th>Qualification</th><th>Joining</th><th>Contact</th><th>Status</th></tr></thead>
          <tbody>
            {(teachers || []).map((t) => (
              <tr key={t.id}>
                <td className="font-mono text-xs">{t.employee_id}</td>
                <td className="font-medium">{t.profiles?.full_name}</td>
                <td><Badge color="blue">{t.subjects?.name || "—"}</Badge></td>
                <td className="text-xs">{t.qualification}</td>
                <td className="text-xs">{t.joining_date || "—"}</td>
                <td className="text-xs">{t.profiles?.phone || "—"}</td>
                <td><Badge color={t.profiles?.is_active ? "green" : "red"}>{t.profiles?.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!teachers?.length && <p className="py-10 text-center text-slate-400">No teachers yet.</p>}
      </div>
      <div className="card mt-6">
        <h2 className="card-title">✏️ Edit Teacher Details</h2>
        <form action={updateProfileRecord} className="mt-4 grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="role" value="teacher" />
          <label className="block"><span className="label">Teacher</span>
            <select name="user_id" className="input" required>
              {(teachers || []).map((t) => <option key={t.profile_id} value={t.profile_id}>{t.employee_id} — {t.profiles?.full_name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Full Name</span><input name="full_name" className="input" /></label>
          <label className="block"><span className="label">Phone</span><input name="phone" className="input" /></label>
          <label className="block"><span className="label">Qualification</span><input name="qualification" className="input" /></label>
          <label className="block"><span className="label">Subject</span>
            <select name="subject_id" className="input"><option value="">—</option>
              {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="label">Joining Date</span><input name="joining_date" type="date" className="input" /></label>
          <div className="flex items-end"><button className="btn-primary w-full">Save Changes</button></div>
        </form>
      </div>
    </>
  );
}
