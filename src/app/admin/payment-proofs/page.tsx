import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { formatCurrency, monthLabel } from "@/lib/utils";
import { approvePaymentProof, rejectPaymentProof } from "@/lib/actions/fees";

export const dynamic = "force-dynamic";

export default async function PaymentProofsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("verify_payments");
  const sp = await searchParams;
  const admin = createAdminClient();
  const { data: proofs } = await admin.from("payment_proofs")
    .select("*, students(admission_no, profiles(full_name)), receipts(receipt_no)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Payment Proofs" subtitle="Review student-submitted payments. Approve → month becomes Paid + receipt generated. Reject → stays unresolved." />
      {(sp.approved || sp.rejected) && (
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {sp.approved ? `Payment approved${sp.receipt ? ` — Receipt ${sp.receipt} generated` : ""}.` : "Payment rejected."}
        </div>
      )}

      <div className="space-y-4">
        {(proofs || []).map((p) => (
          <div key={p.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{p.students?.profiles?.full_name}</span>
                  <span className="font-mono text-xs text-slate-400">{p.students?.admission_no}</span>
                  <Badge color={p.status === "approved" ? "green" : p.status === "rejected" ? "red" : "amber"}>{p.status}</Badge>
                  {p.receipts?.receipt_no && <Badge color="blue">🧾 {p.receipts.receipt_no}</Badge>}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {monthLabel(p.month)} — <b>{formatCurrency(p.amount)}</b> via {p.method}
                  {p.reference_no && <> · Ref: <span className="font-mono">{p.reference_no}</span></>}
                </div>
                {p.note && <div className="mt-1 text-xs text-slate-400">Note: {p.note}</div>}
                {p.rejection_reason && <div className="mt-1 text-xs text-red-500">Rejected: {p.rejection_reason}</div>}
                <div className="mt-1 text-xs text-slate-400">Submitted {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-start gap-4">
                {p.proof_url && (
                  <a href={p.proof_url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.proof_url} alt="proof" className="h-28 w-28 rounded-lg object-cover ring-1 ring-slate-200 hover:scale-105 transition" />
                  </a>
                )}
                {p.status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <form action={approvePaymentProof}>
                      <input type="hidden" name="proof_id" value={p.id} />
                      <button className="btn-primary btn-sm w-full">✔ Approve & Receipt</button>
                    </form>
                    <form action={rejectPaymentProof} className="flex gap-1">
                      <input type="hidden" name="proof_id" value={p.id} />
                      <input name="reason" className="input !px-2 !py-1 text-xs" placeholder="Reason" />
                      <button className="btn-danger btn-sm">✕</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {!proofs?.length && <EmptyState message="No payment submissions yet." />}
      </div>
    </>
  );
}
