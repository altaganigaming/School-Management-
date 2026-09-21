import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, monthLabel, monthOptions } from "@/lib/utils";
import { generateFeeMonths, recordManualPayment } from "@/lib/actions/fees";

export const dynamic = "force-dynamic";

export default async function FeesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_fees");
  const sp = await searchParams;
  const admin = createAdminClient();
  const { data: students } = await admin.from("students")
    .select("id, admission_no, monthly_fee, profiles(full_name), classes(name, section)")
    .order("admission_no");
  const { data: records } = await admin.from("fee_records").select("*").order("month");
  const byStudent = new Map<string, any[]>();
  for (const r of records ?? []) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id)!.push(r);
  }

  return (
    <>
      <PageHeader title="Fee Ledger" subtitle="Monthly fee records for every student." />
      {(sp.generated || sp.paid) && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {sp.generated ? "Fee months generated." : `Payment recorded${sp.receipt ? ` — Receipt ${sp.receipt}` : ""}.`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* GENERATE MONTHS */}
        <form action={generateFeeMonths} className="card h-fit">
          <h2 className="card-title">⚙️ Generate Fee Months</h2>
          <p className="mt-1 text-xs text-slate-400">Creates pending fee rows using each student's monthly fee.</p>
          <div className="mt-4 space-y-3">
            <label className="block"><span className="label">Student</span>
              <select name="student_id" className="input" required>
                {(students || []).map((s) => <option key={s.id} value={s.id}>{s.admission_no} — {s.profiles?.full_name}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Starting Month</span>
              <select name="start_month" className="input">{monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
            </label>
            <label className="block"><span className="label">Number of Months</span>
              <input name="months" type="number" defaultValue={12} min={1} max={36} className="input" /></label>
            <button className="btn-primary w-full">Generate</button>
          </div>
        </form>

        {/* MANUAL PAYMENT */}
        <form action={recordManualPayment} className="card h-fit">
          <h2 className="card-title">💵 Record Office Payment</h2>
          <p className="mt-1 text-xs text-slate-400">Mark a month as paid (e.g. cash at office) — receipt generated instantly.</p>
          <div className="mt-4 space-y-3">
            <label className="block"><span className="label">Student</span>
              <select name="student_id" className="input" required>
                {(students || []).map((s) => <option key={s.id} value={s.id}>{s.admission_no} — {s.profiles?.full_name}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Month</span>
              <select name="month" className="input">{monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
            </label>
            <label className="block"><span className="label">Amount (₹)</span><input name="amount" type="number" step="0.01" className="input" required /></label>
            <label className="block"><span className="label">Method</span>
              <select name="method" className="input"><option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option></select>
            </label>
            <label className="block"><span className="label">Reference No. (optional)</span><input name="reference_no" className="input" /></label>
            <button className="btn-primary w-full">Record & Generate Receipt</button>
          </div>
        </form>

        {/* LEDGER TABLE */}
        <div className="card overflow-x-auto lg:col-span-1">
          <h2 className="card-title mb-3">Ledger</h2>
          <div className="max-h-[600px] overflow-y-auto">
            <table className="table">
              <thead><tr><th>Student</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {(records || []).map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">{students?.find((s) => s.id === r.student_id)?.profiles?.full_name ?? r.student_id.slice(0, 6)}</td>
                    <td className="text-xs">{monthLabel(r.month)}</td>
                    <td className="text-xs">{formatCurrency(r.amount)}</td>
                    <td><Badge color={r.status === "paid" ? "green" : "amber"}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records?.length && <EmptyState message="No fee records yet — generate months first." />}
          </div>
        </div>
      </div>

      {/* PER-STUDENT SUMMARY */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="card-title mb-3">Student Fee Summary</h2>
        <table className="table">
          <thead><tr><th>Adm. No</th><th>Student</th><th>Class</th><th>Monthly Fee</th><th>Paid</th><th>Pending</th></tr></thead>
          <tbody>
            {(students || []).map((s) => {
              const recs = byStudent.get(s.id) ?? [];
              const paid = recs.filter((r) => r.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
              const pending = recs.filter((r) => r.status === "pending").reduce((a, b) => a + Number(b.amount), 0);
              return (
                <tr key={s.id}>
                  <td className="font-mono text-xs">{s.admission_no}</td>
                  <td className="font-medium">{s.profiles?.full_name}</td>
                  <td className="text-xs">{s.classes ? `${s.classes.name}-${s.classes.section}` : "—"}</td>
                  <td>{formatCurrency(s.monthly_fee)}</td>
                  <td className="text-emerald-600">{formatCurrency(paid)}</td>
                  <td className={pending > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>{formatCurrency(pending)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!students?.length && <EmptyState message="No students yet." />}
      </div>
    </>
  );
}
