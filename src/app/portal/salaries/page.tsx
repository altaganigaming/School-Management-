import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireLogin } from "@/lib/auth";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { formatCurrency, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SalaryRecordsPage() {
  const profile = await requireLogin();
  if (profile.role === "student") redirect("/portal");
  if (profile.role === "super_admin") redirect("/admin");

  const supabase = await createClient();
  let records;
  if (profile.role === "teacher") {
    const { data: teacher } = await supabase.from("teachers").select("id").eq("profile_id", profile.id).maybeSingle();
    const result = teacher
      ? await supabase.from("salary_records").select("*").eq("teacher_id", teacher.id).order("month", { ascending: false })
      : { data: [] };
    records = result.data;
  } else {
    const { data } = await supabase.from("salary_records").select("*").eq("profile_id", profile.id).order("month", { ascending: false });
    records = data;
  }
  const salaryRows = records || [];
  const paidTotal = salaryRows.filter((record) => record.status === "paid").reduce((total, record) => total + Number(record.amount), 0);

  return (
    <>
      <PageHeader title="Salary Records" subtitle="Your monthly salary history and payment status." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card border-t-4 border-emerald-500"><div className="text-sm text-slate-500">Total Paid</div><div className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(paidTotal)}</div></div>
        <div className="card border-t-4 border-primary-500"><div className="text-sm text-slate-500">Salary Entries</div><div className="mt-1 text-2xl font-bold text-slate-900">{salaryRows.length}</div></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Paid On</th></tr></thead>
          <tbody>
            {salaryRows.map((record) => (
              <tr key={record.id}>
                <td className="font-medium">{monthLabel(record.month)}</td>
                <td>{formatCurrency(record.amount)}</td>
                <td><Badge color={record.status === "paid" ? "green" : "amber"}>{record.status}</Badge></td>
                <td className="text-xs">{record.paid_at ? new Date(record.paid_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!salaryRows.length && <EmptyState message="No salary records have been added yet. Contact the school office for details." />}
      </div>
    </>
  );
}