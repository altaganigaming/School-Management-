import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, monthLabel, monthOptions } from "@/lib/utils";
import { addSalaryRecord, paySalary } from "@/lib/actions/fees";

export const dynamic = "force-dynamic";

export default async function SalariesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_salaries");
  const sp = await searchParams;
  const admin = createAdminClient();
  const { data: teachers } = await admin.from("teachers")
    .select("id, employee_id, profiles(full_name)").order("employee_id");
  const { data: records } = await admin.from("salary_records")
    .select("*, teachers(employee_id, profiles(full_name))").order("month", { ascending: false });

  return (
    <>
      <PageHeader title="Salaries" subtitle="Monthly salary records for faculty." />
      {(sp.added || sp.paid) && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved.</div>}

      <form action={addSalaryRecord} className="card mb-6 grid gap-4 sm:grid-cols-4">
        <h2 className="card-title sm:col-span-4">➕ Add Salary Record</h2>
        <label className="block"><span className="label">Teacher</span>
          <select name="teacher_id" className="input" required>
            {(teachers || []).map((t) => <option key={t.id} value={t.id}>{t.employee_id} — {t.profiles?.[0]?.full_name}</option>)}
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
                <td className="font-medium">{r.teachers?.profiles?.full_name}<br /><span className="font-mono text-xs text-slate-400">{r.teachers?.employee_id}</span></td>
                <td>{monthLabel(r.month)}</td>
                <td>{formatCurrency(r.amount)}</td>
                <td><Badge color={r.status === "paid" ? "green" : "amber"}>{r.status}</Badge></td>
                <td className="text-xs">{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</td>
                <td className="text-right">
                  {r.status === "pending" && (
                    <form action={paySalary}>
                      <input type="hidden" name="record_id" value={r.id} />
                      <button className="btn-primary btn-sm">Mark Paid</button>
                    </form>
                  )}
                  {r.status === "paid" && <a href={`/admin/salaries/slip/${r.id}`} className="btn-secondary btn-sm">View Slip</a>}
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
