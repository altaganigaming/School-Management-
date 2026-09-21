import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ count: students }, { count: teachers }, { count: staff }, { count: pendingProofs }, { data: pendingLeaves }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("teachers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "staff"),
    supabase.from("payment_proofs").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("leave_requests").select("*").eq("status", "pending"),
  ]);

  const { data: feeAgg } = await supabase.from("fee_records").select("amount, status");
  const paid = (feeAgg || []).filter((f) => f.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
  const pending = (feeAgg || []).filter((f) => f.status === "pending").reduce((a, b) => a + Number(b.amount), 0);

  return (
    <>
      {sp.denied && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
          You do not have permission to access that module.
        </div>
      )}
      <PageHeader title="Dashboard" subtitle="Welcome to the school management panel." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="🎓" label="Students" value={students ?? 0} hint="Enrolled" />
        <StatCard icon="👩‍🏫" label="Teachers" value={teachers ?? 0} />
        <StatCard icon="🗂️" label="Staff" value={staff ?? 0} />
        <StatCard icon="🧾" label="Pending Payment Proofs" value={pendingProofs ?? 0}
          hint={pendingProofs ? <Link className="text-primary-600 underline" href="/admin/payment-proofs">Review now →</Link> : "All clear"} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="💰" label="Fees Collected" value={formatCurrency(paid)} />
        <StatCard icon="⏳" label="Fees Pending" value={formatCurrency(pending)} />
        <StatCard icon="🌴" label="Leave Requests" value={pendingLeaves?.length ?? 0} />
        <StatCard icon="🏫" label="Quick Access" value={<Link href="/admin/students" className="text-base text-primary-600 underline">Manage Students</Link>} />
      </div>

      {(pendingLeaves?.length ?? 0) > 0 && (
        <div className="card mt-6">
          <h2 className="card-title">Pending Leave Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead><tr><th>Applicant</th><th>Dates</th><th>Reason</th><th></th></tr></thead>
              <tbody>
                {pendingLeaves!.map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium">{l.profile_id}</td>
                    <td>{l.from_date} → {l.to_date}</td>
                    <td className="max-w-xs truncate">{l.reason}</td>
                    <td><Link href="/admin/leave" className="text-primary-600 text-sm font-semibold">Review →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
