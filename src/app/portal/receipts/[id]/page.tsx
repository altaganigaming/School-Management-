import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStudent, getSettings } from "@/lib/auth";
import { formatCurrency, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireStudent();
  const { id } = await params;
  const s = await getSettings();
  const supabase = await createClient();
  const { data: r } = await supabase.from("receipts")
    .select("*, students!inner(profile_id, admission_no, classes(name, section))").eq("id", id).single();
  if (!r || r.students.profile_id !== profile.id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div id="receipt" className="card !p-10">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">{s.school_name}</h1>
          <p className="text-sm text-slate-500">{s.contact?.address} · {s.contact?.phone}</p>
          <h2 className="mt-4 inline-block rounded-lg bg-emerald-50 px-6 py-1 text-sm font-bold uppercase tracking-widest text-emerald-700">Fee Receipt</h2>
          <p className="mt-1 font-mono text-sm text-slate-500">{r.receipt_no}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-400">Student:</span> <b>{profile.full_name}</b></div>
          <div><span className="text-slate-400">Admission No:</span> <b>{r.students.admission_no}</b></div>
          <div><span className="text-slate-400">Class:</span> {r.students.classes ? `${r.students.classes.name}-${r.students.classes.section}` : "—"}</div>
          <div><span className="text-slate-400">Month:</span> <b>{monthLabel(r.month)}</b></div>
          <div><span className="text-slate-400">Method:</span> <span className="capitalize">{r.method || "—"}</span></div>
          <div><span className="text-slate-400">Reference:</span> {r.reference_no || "—"}</div>
          <div className="col-span-2 mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-4">
            <span className="font-semibold text-slate-600">Amount Received</span>
            <span className="text-2xl font-bold text-emerald-600">{formatCurrency(r.amount)}</span>
          </div>
          <div><span className="text-slate-400">Date:</span> {new Date(r.issued_at).toLocaleDateString()}</div>
        </div>
        <div className="mt-10 flex justify-end text-xs text-slate-400">
          <div className="mt-8 border-t border-slate-300 pt-1">Authorized Signature</div>
        </div>
      </div>
      <a href="#receipt" download={`receipt-${r.receipt_no}.html`} className="btn-primary mt-4 block w-full text-center">Download Receipt</a>
    </div>
  );
}
