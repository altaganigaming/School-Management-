import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, StatCard } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { hasPerm } from "@/lib/permissions";
import { reviewLeaveRequest } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const profile = await requireAdmin();
  const supabase = await createClient();
  const canReviewLeaves = profile.role !== "teacher" && hasPerm(profile.role, profile.permissions, "manage_leave");
  const canViewRevenue = profile.role !== "teacher" && hasPerm(profile.role, profile.permissions, "manage_fees");

  const [{ count: students }, { count: teachers }, { count: staff }, { count: pendingProofs }, { data: pendingLeaves }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("teachers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "staff"),
    supabase.from("payment_proofs").select("*", { count: "exact", head: true }).eq("status", "pending"),
    canReviewLeaves
      ? createAdminClient().from("leave_requests").select("*, profiles(full_name)").eq("status", "pending").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const { data: feeAgg } = canViewRevenue
    ? await supabase.from("fee_records").select("amount, status")
    : { data: [] };
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
        {canViewRevenue && <>
          <StatCard icon="💰" label="Fees Collected" value={formatCurrency(paid)} />
          <StatCard icon="⏳" label="Fees Pending" value={formatCurrency(pending)} />
        </>}
        <StatCard icon="🌴" label="Leave Requests" value={pendingLeaves?.length ?? 0} />
        <StatCard icon="🏫" label="Quick Access" value={<Link href="/admin/students" className="text-base text-primary-600 underline">Manage Students</Link>} />
      </div>

      {(pendingLeaves?.length ?? 0) > 0 && (
        <div className="card mt-6">
          <h2 className="card-title">Pending Leave Requests</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead><tr><th>Applicant</th><th>Dates</th><th>Reason</th><th>Decision</th></tr></thead>
              <tbody>
                {pendingLeaves!.map((l) => (
                  <tr key={l.id}>
                    <td className="font-medium">{Array.isArray(l.profiles) ? l.profiles[0]?.full_name || "Name unavailable" : l.profiles?.full_name || "Name unavailable"}</td>
                    <td>{l.from_date} → {l.to_date}</td>
                    <td className="max-w-xs truncate">{l.reason}</td>
                    <td><div className="flex gap-2">
                      <form action={reviewLeaveRequest}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="approved" /><button className="btn-primary btn-sm">Approve</button></form>
                      <form action={reviewLeaveRequest}><input type="hidden" name="id" value={l.id} /><input type="hidden" name="status" value="rejected" /><button className="btn-danger btn-sm">Reject</button></form>
                    </div></td>
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
