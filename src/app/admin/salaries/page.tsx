import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, monthLabel, monthOptions } from "@/lib/utils";
import { addSalaryRecord, deleteSalaryRecord, paySalary } from "@/lib/actions/fees";
import { ensureTeacherRecords } from "@/lib/admin-records";

export const dynamic = "force-dynamic";

export default async function SalariesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_salaries");
  const sp = await searchParams;
  const admin = createAdminClient();
  await ensureTeacherRecords();
  const { data: teachers } = await admin.from("teachers")
    .select("id, profile_id, employee_id, profiles(full_name)").order("employee_id");
  const { data: staff } = await admin.from("profiles").select("id, full_name").eq("role", "staff").order("full_name");
  const { data: records } = await admin.from("salary_records")
    .select("*, teachers(employee_id, profile_id, profiles(full_name)), profiles(full_name, role)").order("month", { ascending: false });
  const teacherName = (teacher: { profiles?: { full_name?: string } | Array<{ full_name?: string }> | null }) =>
    Array.isArray(teacher.profiles) ? teacher.profiles[0]?.full_name || "Name unavailable" : teacher.profiles?.full_name || "Name unavailable";

  return (
    <>
      <PageHeader title="Salaries" subtitle="Monthly salary records for teachers and staff." />
      {(sp.added || sp.paid || sp.deleted) && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">{sp.deleted ? "Salary record deleted." : "Saved."}</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{sp.error === "duplicate" ? "This teacher already has a salary record for that month." : sp.error === "delete" ? "Salary record could not be deleted." : "Please check the teacher and amount."}</div>}

      <form action={addSalaryRecord} className="card mb-6 grid gap-4 sm:grid-cols-4">
        <h2 className="card-title sm:col-span-4">➕ Add Salary Record</h2>
        <label className="block"><span className="label">Teacher or Staff</span>
          <select name="salary_target" className="input" required defaultValue="">
            <option value="" disabled>Select an employee</option>
            {(teachers || []).map((t) => <option key={t.id} value={`teacher:${t.id}`}>{teacherName(t)} · Teacher</option>)}
            {(staff || []).map((person) => <option key={person.id} value={`staff:${person.id}`}>{person.full_name} · Staff</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Month</span>
          <select name="month" className="input">{monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
        </label>
        <label className="block"><span className="label">Amount (₹)</span><input name="amount" type="number" step="0.01" className="input" required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Add</button></div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Teacher</th><th>Month</th><th>Amount</th><th>Status</th><th>Paid On</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {(records || []).map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.profile_id ? r.profiles?.full_name || "Name unavailable" : r.teachers ? teacherName(r.teachers) : "Name unavailable"}</td>
                <td>{monthLabel(r.month)}</td>
                <td>{formatCurrency(r.amount)}</td>
                <td><Badge color={r.status === "paid" ? "green" : "amber"}>{r.status}</Badge><div className="mt-1 text-xs capitalize text-slate-400">{r.profile_id ? "Staff" : "Teacher"}</div></td>
                <td className="text-xs">{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                <td className="text-right">
                  {r.status === "pending" && (
                    <form action={paySalary}>
                      <input type="hidden" name="record_id" value={r.id} />
                      <button className="btn-primary btn-sm">Mark Paid</button>
                    </form>
                  )}
                  {r.status === "paid" && <a href={`/admin/salaries/slip/${r.id}`} className="btn-secondary btn-sm">View Slip</a>}
                  <form action={deleteSalaryRecord} className="mt-1">
                    <input type="hidden" name="record_id" value={r.id} />
                    <button className="btn-danger btn-sm">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records?.length && <EmptyState message="No salary records yet." />}
      </div>
    </>
  );
}
