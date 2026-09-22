import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, monthLabel, monthOptions } from "@/lib/utils";
import { submitPaymentProof } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";

export default async function PortalFeesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireStudent();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("*").eq("profile_id", profile.id).single();
  const [{ data: fees }, { data: proofs }, { data: receipts }] = await Promise.all([
    supabase.from("fee_records").select("*").eq("student_id", student?.id).order("month"),
    supabase.from("payment_proofs").select("*").eq("student_id", student?.id).order("created_at", { ascending: false }),
    supabase.from("receipts").select("*").eq("student_id", student?.id).order("issued_at", { ascending: false }),
  ]);
  const paid = (fees || []).filter((f) => f.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
  const pending = (fees || []).filter((f) => f.status === "pending");

  return (
    <>
      <PageHeader title="Fees & Payments" subtitle={`Monthly fee: ${formatCurrency(student?.monthly_fee)}`} />
      {sp.submitted && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Payment proof submitted. The school will review it shortly.</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card border-t-4 border-emerald-500"><div className="text-sm text-slate-500">Total Paid</div><div className="text-2xl font-bold text-emerald-600">{formatCurrency(paid)}</div></div>
        <div className="card border-t-4 border-amber-500"><div className="text-sm text-slate-500">Total Pending</div><div className="text-2xl font-bold text-amber-600">{formatCurrency(pending.reduce((a, b) => a + Number(b.amount), 0))}</div>
          <div className="text-xs text-slate-400">{pending.length} month(s) outstanding</div></div>
      </div>

      {/* SUBMIT PAYMENT PROOF */}
      <form action={submitPaymentProof} className="card mt-6">
        <h2 className="card-title">📤 Submit Payment Proof</h2>
        <p className="mt-1 text-xs text-slate-400">Pay via cash/bank/UPI at or to the school, then submit the details. After approval your receipt is generated automatically.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="student_id" value={student?.id} />
          <label className="block"><span className="label">Month</span>
            <select name="month" className="input" required>
              {pending.length
                ? pending.map((f) => <option key={f.month} value={f.month}>{monthLabel(f.month)} — {formatCurrency(f.amount)}</option>)
                : monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select></label>
          <label className="block"><span className="label">Amount (₹)</span>
            <input name="amount" type="number" step="0.01" defaultValue={pending[0]?.amount ?? student?.monthly_fee} className="input" required /></label>
          <label className="block"><span className="label">Payment Method</span>
            <select name="method" className="input"><option value="cash">Cash (at office)</option><option value="bank">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option></select></label>
          <label className="block"><span className="label">Transaction / Reference No.</span>
            <input name="reference_no" className="input" placeholder="e.g. UTR number" /></label>
          <label className="block"><span className="label">Note (optional)</span>
            <input name="note" className="input" /></label>
        </div>
        <button className="btn-primary mt-4">Submit for Verification</button>
      </form>

      {/* FEE LEDGER */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="card-title mb-3">Fee Ledger</h2>
        <table className="table">
          <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Paid On</th></tr></thead>
          <tbody>
            {(fees || []).map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{monthLabel(f.month)}</td>
                <td>{formatCurrency(f.amount)}</td>
                <td><Badge color={f.status === "paid" ? "green" : "amber"}>{f.status}</Badge></td>
                <td className="text-xs">{f.paid_at ? new Date(f.paid_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!fees?.length && <EmptyState message="No fee records yet. Contact the school office." />}
      </div>

      {/* PAYMENT HISTORY + RECEIPTS */}
      <div className="card mt-6 overflow-x-auto">
        <h2 className="card-title mb-3">Payment History & Receipts</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Month</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th></tr></thead>
          <tbody>
            {(proofs || []).map((p) => (
              <tr key={p.id}>
                <td className="text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                <td>{monthLabel(p.month)}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td className="capitalize">{p.method}</td>
                <td>
                  <Badge color={p.status === "approved" ? "green" : p.status === "rejected" ? "red" : "amber"}>{p.status}</Badge>
                  {p.rejection_reason && <div className="text-xs text-red-500">{p.rejection_reason}</div>}
                </td>
                <td>{p.receipt_id ? <a href={`/portal/receipts/${p.receipt_id}`} className="text-primary-600 text-sm font-semibold underline">View ⭳</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!proofs?.length && <EmptyState message="No payments submitted yet." />}
      </div>
    </>
  );
}
