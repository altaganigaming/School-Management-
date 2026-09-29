import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { deleteLeaveRequest, reviewLeaveRequest, submitLeave } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";

export default async function LeavePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  if (me.role !== "teacher") await requireAdmin("manage_leave");
  const sp = await searchParams;
  const admin = createAdminClient();
  let leavesQuery = admin.from("leave_requests").select("*, profiles(full_name, role)").order("created_at", { ascending: false });
  if (me.role === "teacher") leavesQuery = leavesQuery.eq("profile_id", me.id);
  const { data: leaves } = await leavesQuery;

  return (
    <>
      <PageHeader title={me.role === "teacher" ? "My Leave Requests" : "Leave Requests"} subtitle={me.role === "teacher" ? "Submit a leave request and track its status." : "Review leave applications from staff, teachers and students."} />
      {sp.submitted && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Leave request submitted.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "invalid" ? "Enter a valid date range and reason." : "Leave request could not be submitted."}</div>}
      {me.role === "teacher" && <form action={submitLeave} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block"><span className="label">Leave Type</span><select name="type" className="input"><option value="casual">Casual</option><option value="sick">Sick</option><option value="other">Other</option></select></label>
        <label className="block"><span className="label">From</span><input name="from_date" type="date" className="input" required /></label>
        <label className="block"><span className="label">To</span><input name="to_date" type="date" className="input" required /></label>
        <label className="block sm:col-span-2"><span className="label">Reason</span><textarea name="reason" className="input" rows={2} required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Submit Leave Request</button></div>
      </form>}
      <div className="space-y-3">
        {(leaves || []).map((l) => (
          <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <b>{Array.isArray(l.profiles) ? l.profiles[0]?.full_name || "Name unavailable" : l.profiles?.full_name || "Name unavailable"}</b>
                <Badge color={l.profiles?.role === "student" ? "blue" : "green"}>{l.profiles?.role}</Badge>
                <Badge color={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-500">{l.type} leave · {l.from_date} → {l.to_date}</div>
              <div className="text-xs text-slate-400">{l.reason}</div>
              {l.review_note && <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Review note: {l.review_note}</div>}
            </div>
            {me.role !== "teacher" && l.status === "pending" && (
              <div className="flex gap-2">
                <form action={reviewLeaveRequest}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value="approved" />
                  <input name="review_note" className="input mb-2 text-xs" placeholder="Optional note" />
                  <button className="btn-primary btn-sm">Approve</button>
                </form>
                <form action={reviewLeaveRequest}>
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <input name="review_note" className="input mb-2 text-xs" placeholder="Reason required" required />
                  <button className="btn-danger btn-sm">Reject</button>
                </form>
              </div>
            )}
            {(me.role === "super_admin" || me.role === "staff" || (me.role === "teacher" && l.status === "pending")) && <form action={deleteLeaveRequest}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn-danger btn-sm">Delete</button>
            </form>}
          </div>
        ))}
        {!leaves?.length && <EmptyState message="No leave requests." />}
      </div>
    </>
  );
}
