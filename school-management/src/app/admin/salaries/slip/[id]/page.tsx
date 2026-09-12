import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/auth";
import { formatCurrency, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalarySlipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("manage_salaries");
  const { id } = await params;
  const s = await getSettings();
  const admin = createAdminClient();
  const { data: r } = await admin.from("salary_records")
    .select("*, teachers(employee_id, qualification, joining_date, profiles(full_name))").eq("id", id).single();
  if (!r) notFound();
  const t = r.teachers;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card !p-10">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">{s.school_name}</h1>
          <p className="text-sm text-slate-500">{s.contact?.address} · {s.contact?.phone}</p>
          <h2 className="mt-4 inline-block rounded-lg bg-slate-100 px-6 py-1 text-sm font-bold uppercase tracking-widest">Salary Slip</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-400">Employee:</span> <b>{t?.profiles?.full_name}</b></div>
          <div><span className="text-slate-400">Employee ID:</span> <b>{t?.employee_id}</b></div>
          <div><span className="text-slate-400">Month:</span> <b>{monthLabel(r.month)}</b></div>
          <div><span className="text-slate-400">Status:</span> <b className="text-emerald-600">PAID</b></div>
          <div><span className="text-slate-400">Paid On:</span> {r.paid_at ? new Date(r.paid_at).toLocaleDateString() : "—"}</div>
          <div><span className="text-slate-400">Net Salary:</span> <b className="text-lg">{formatCurrency(r.amount)}</b></div>
        </div>
        <div className="mt-10 flex justify-between text-xs text-slate-400">
          <div>Generated: {new Date().toLocaleDateString()}</div>
          <div className="mt-8 border-t border-slate-300 pt-1">Authorized Signature</div>
        </div>
      </div>
      <button onClick={undefined} className="btn-primary mt-4 w-full print:hidden" /* print via browser */ >Use browser Print (Ctrl+P) to save as PDF</button>
    </div>
  );
}
