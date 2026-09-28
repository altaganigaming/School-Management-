import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader, Badge, Field } from "@/components/ui";
import { createAccount, toggleAccount, resetPassword, deleteAccount } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: users }, { data: classes }, { data: subjects }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("classes").select("id, name, section").order("name").order("section"),
    admin.from("subjects").select("id, name").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Users & Accounts" subtitle="Create and manage all login accounts." />
      {sp.created && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Account created: <b>@{sp.created}</b></div>}
      {sp.error === "exists" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Username already taken.</div>}
      {sp.error === "missing" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Complete the account details, then provide the student admission number, class and roll number or the teacher employee ID and assigned classes.</div>}
      {sp.error === "save" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Account details could not be saved. Check the class, roll number, and ID values and try again.</div>}
      {(sp.reset || sp.updated || sp.deleted) && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Done.</div>}
      {sp.protected && <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">The super admin account is protected and cannot be deactivated.</div>}

      {/* CREATE ACCOUNT FORM */}
      <form action={createAccount} className="card mb-8">
        <h2 className="card-title">➕ Create Account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Role"><select name="role" className="input" required>
            <option value="teacher">Teacher</option><option value="staff">Staff</option><option value="student">Student</option>
          </select></Field>
          <Field label="Username"><input name="username" className="input" required /></Field>
          <Field label="Password"><input name="password" className="input" required minLength={6} /></Field>
          <Field label="Full Name"><input name="full_name" className="input" required /></Field>
          <Field label="Admission No. (student)"><input name="admission_no" className="input" placeholder="e.g. ADM-2026-001" /></Field>
          <Field label="Employee ID (teacher)"><input name="employee_id" className="input" placeholder="e.g. EMP-001" /></Field>
          <Field label="Student Class / Section"><select name="class_id" className="input" defaultValue="">
            <option value="">Select class</option>
            {(classes || []).map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}
          </select></Field>
          <Field label="Student Roll No."><input name="roll_no" type="number" min={1} className="input" /></Field>
          <Field label="Teacher Classes"><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="assigned_classes" value="" />
            {(classes || []).map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_classes" value={item.id} className="h-4 w-4" />{item.name} - {item.section}</label>)}
          </div></Field>
          <Field label="Teacher Subjects"><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="assigned_subjects" value="" />
            {(subjects || []).map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_subjects" value={item.id} className="h-4 w-4" />{item.name}</label>)}
          </div></Field>
          <Field label="Phone"><input name="phone" className="input" /></Field>
          <Field label="Parent Name"><input name="parent_name" className="input" placeholder="students only" /></Field>
          <Field label="Parent Phone"><input name="parent_phone" className="input" placeholder="students only" /></Field>
          <Field label="Monthly Fee"><input name="monthly_fee" type="number" className="input" placeholder="students only" /></Field>
          <Field label="Qualification"><input name="qualification" className="input" placeholder="teachers only" /></Field>
          <Field label="Joining / Admission Date"><input name="admission_date" type="date" className="input" /></Field>
          <Field label="Address"><input name="address" className="input" /></Field>
        </div>
        <button className="btn-primary mt-4">Create Account</button>
        <p className="mt-2 text-xs text-slate-400">Student accounts use one class and roll number. Teacher accounts can be assigned to multiple classes.</p>
      </form>

      {/* USERS TABLE */}
      <div className="card overflow-x-auto">
        <h2 className="card-title mb-4">All Accounts ({users?.length ?? 0})</h2>
        <table className="table">
          <thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td className="font-mono text-xs">@{u.username}</td>
                <td className="font-medium">{u.full_name}</td>
                <td><Badge color={u.role === "super_admin" ? "purple" : u.role === "student" ? "blue" : "green"}>{u.role.replace("_", " ")}</Badge></td>
                <td><Badge color={u.is_active ? "green" : "red"}>{u.is_active ? "Active" : "Deactivated"}</Badge></td>
                <td className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <details className="relative">
                      <summary className="btn-secondary btn-sm cursor-pointer list-none">Reset PW</summary>
                      <form action={resetPassword} className="absolute right-0 z-10 mt-1 flex w-52 gap-1 rounded-lg bg-white p-2 shadow-xl ring-1 ring-slate-200">
                        <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="role" value={u.role} />
                        <input name="password" className="input" placeholder="New password" required minLength={6} />
                        <button className="btn-primary btn-sm">Set</button>
                      </form>
                    </details>
                    {u.role !== "super_admin" && <form action={toggleAccount}>
                      <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="role" value={u.role} />
                      <input type="hidden" name="active" value={u.is_active ? "false" : "true"} />
                      <button className={u.is_active ? "btn-danger btn-sm" : "btn-primary btn-sm"}>{u.is_active ? "Deactivate" : "Reactivate"}</button>
                    </form>}
                    {u.role === "super_admin" && <span className="btn-secondary btn-sm cursor-default">Protected</span>}
                    {u.role !== "super_admin" && (
                      <form action={deleteAccount} onSubmit={undefined}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <button className="btn-danger btn-sm" formAction={deleteAccount}>Delete</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
