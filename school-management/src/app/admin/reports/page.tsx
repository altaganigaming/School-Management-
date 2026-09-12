import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin("manage_fees");
  const admin = createAdminClient();
  const [{ count: totalStudents }, { data: feeRecords }, { data: receipts }, { data: attendance }] = await Promise.all([
    admin.from("students").select("*", { count: "exact", head: true }),
    admin.from("fee_records").select("amount, status"),
    admin.from("receipts").select("amount, issued_at"),
    admin.from("attendance").select("status"),
  ]);

  const paid = (feeRecords || []).filter((f) => f.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
  const pending = (feeRecords || []).filter((f) => f.status === "pending").reduce((a, b) => a + Number(b.amount), 0);
  const present = (attendance || []).filter((a) => a.status === "present").length;
  const attRate = attendance?.length ? Math.round((present / attendance.length) * 100) : 0;

  const monthly = new Map<string, number>();
  for (const r of receipts ?? []) {
    const m = r.issued_at.slice(0, 7);
    monthly.set(m, (monthly.get(m) ?? 0) + Number(r.amount));
  }

  return (
    <>
      <PageHeader title="Reports" subtitle="School-wide financial and attendance overview." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🎓" label="Total Students" value={totalStudents ?? 0} />
        <StatCard icon="💰" label="Total Fees Collected" value={formatCurrency(paid)} />
        <StatCard icon="⏳" label="Total Fees Pending" value={formatCurrency(pending)} />
        <StatCard icon="✅" label="Attendance Rate" value={`${attRate}%`} hint={`${attendance?.length ?? 0} records`} />
      </div>

      <div className="card mt-6">
        <h2 className="card-title mb-4">Monthly Collections</h2>
        <table className="table">
          <thead><tr><th>Month</th><th>Collected</th></tr></thead>
          <tbody>
            {[...monthly.entries()].sort().reverse().map(([m, amt]) => (
              <tr key={m}>
                <td className="font-medium">{new Date(m + "-02").toLocaleString("en-US", { month: "long", year: "numeric" })}</td>
                <td className="text-emerald-600 font-semibold">{formatCurrency(amt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!monthly.size && <p className="py-8 text-center text-slate-400">No collections recorded yet.</p>}
      </div>
    </>
  );
}
