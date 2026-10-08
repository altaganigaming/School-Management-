import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { deleteLeaveRequest, reviewLeaveRequest, submitLeave } from "@/lib/actions/portal";
import { hasPerm } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function LeavePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const canManageLeaves = hasPerm(me.role, me.permissions, "manage_leave");
  if (canManageLeaves) await requireAdmin("manage_leave");
  const sp = await searchParams;
  const admin = createAdminClient();
  let leavesQuery = admin.from("leave_requests")
    .select("*, profiles(full_name, role), leave_request_history(id, event, previous_status, status, review_note, changed_by, created_at)")
    .order("created_at", { ascending: false });
  if (!canManageLeaves) leavesQuery = leavesQuery.eq("profile_id", me.id);
  const { data: leaves } = await leavesQuery;
  const { data: deletedRequests } = canManageLeaves
    ? await admin.from("leave_request_history").select("*").eq("event", "deleted").order("created_at", { ascending: false }).limit(100)
    : { data: [] };

  return (
    <>
      <PageHeader title={canManageLeaves ? "Leave Requests" : "My Leave Requests"} subtitle={canManageLeaves ? "Review leave applications from staff, teachers and students." : "Submit a leave request and track its status."} />
      {sp.submitted && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Leave request submitted.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "invalid" ? "Enter a valid date range and reason." : sp.error === "save" ? "The request could not be updated. Try again." : sp.error === "delete" ? "Leave request could not be deleted." : "Leave request could not be submitted."}</div>}
      {(me.role === "teacher" || me.role === "staff") && <form action={submitLeave} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              {!!l.leave_request_history?.length && <details className="mt-2 text-xs text-slate-500">
                <summary className="cursor-pointer font-medium">Status history ({l.leave_request_history.length})</summary>
                <ul className="mt-1 space-y-1">
                  {[...l.leave_request_history].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((entry) => (
                    <li key={entry.id}>{entry.event === "snapshot" ? `Existing status captured · ${entry.status}` : entry.event === "submitted" ? `Submitted · ${entry.status}` : `${entry.previous_status} → ${entry.status}`} · {new Date(entry.created_at).toLocaleString()}{entry.review_note ? ` · ${entry.review_note}` : ""}</li>
                  ))}
                </ul>
              </details>}
            </div>
            {canManageLeaves && l.status === "pending" && (
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
            {(canManageLeaves || (l.profile_id === me.id && l.status === "pending")) && <form action={deleteLeaveRequest}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn-danger btn-sm">Delete</button>
            </form>}
          </div>
        ))}
        {!leaves?.length && <EmptyState message="No leave requests." />}
      </div>
      {canManageLeaves && !!deletedRequests?.length && <div className="card mt-6 overflow-x-auto">
        <h2 className="card-title mb-3">Deleted Request Audit</h2>
        <table className="table">
          <thead><tr><th>Requester</th><th>Dates</th><th>Reason</th><th>Last Status</th><th>Deleted</th><th>Actor</th></tr></thead>
          <tbody>{deletedRequests.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.requester_name} <span className="text-xs text-slate-500">({entry.requester_role})</span></td>
              <td>{entry.from_date} → {entry.to_date}</td>
              <td>{entry.reason || "—"}</td>
              <td><Badge color={entry.status === "approved" ? "green" : entry.status === "rejected" ? "red" : "amber"}>{entry.status}</Badge></td>
              <td className="text-xs">{new Date(entry.created_at).toLocaleString()}</td>
              <td className="text-xs">{entry.changed_by_name || "Account unavailable"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </>
  );
}
