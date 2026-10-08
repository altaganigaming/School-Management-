import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { deleteLeaveRequest, submitLeave } from "@/lib/actions/portal";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireStudent();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("id").eq("profile_id", profile.id).single();
  const [{ data: records }, { data: leaves }] = await Promise.all([
    supabase.from("attendance").select("*").eq("student_id", student?.id).order("date", { ascending: false }).limit(60),
    supabase.from("leave_requests").select("*, leave_request_history(id, event, previous_status, status, review_note, created_at)").eq("profile_id", profile.id).order("created_at", { ascending: false }),
  ]);
  const present = (records || []).filter((r) => r.status === "present").length;
  const rate = records?.length ? Math.round((present / records.length) * 100) : null;

  return (<>
    <PageHeader title="Attendance" subtitle={rate !== null ? `Overall: ${rate}% present` : "No records yet"} />
    {(sp.submitted || sp.leave) && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Leave request submitted.</div>}
    {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{sp.error === "invalid" ? "Enter a valid date range and reason." : "Leave request could not be submitted."}</div>}

    <form action={submitLeave} className="card mb-6 grid gap-4 sm:grid-cols-4">
      <h2 className="card-title sm:col-span-4">🌴 Apply for Leave</h2>
      <label className="block"><span className="label">Type</span>
        <select name="type" className="input"><option value="casual">Casual</option><option value="sick">Sick</option><option value="other">Other</option></select></label>
      <label className="block"><span className="label">From</span><input name="from_date" type="date" className="input" required /></label>
      <label className="block"><span className="label">To</span><input name="to_date" type="date" className="input" required /></label>
      <div className="flex items-end"><button className="btn-primary w-full">Submit</button></div>
      <label className="block sm:col-span-4"><span className="label">Reason</span>
        <textarea name="reason" className="input" rows={2} required /></label>
    </form>

    <div className="card overflow-x-auto">
      <h2 className="card-title mb-3">Recent Records</h2>
      <table className="table">
        <thead><tr><th>Date</th><th>Status</th></tr></thead>
        <tbody>{(records || []).map((r) => (
          <tr key={r.id}><td>{r.date}</td>
            <td><Badge color={r.status === "present" ? "green" : r.status === "absent" ? "red" : "amber"}>{r.status}</Badge></td></tr>))}
        </tbody>
      </table>
      {!records?.length && <EmptyState message="No attendance records yet." />}
    </div>

      <div className="card mt-6 overflow-x-auto">
      <h2 className="card-title mb-3">My Leave Requests</h2>
      <table className="table">
        <thead><tr><th>Dates</th><th>Type</th><th>Reason / Review Note</th><th>Status / History</th><th></th></tr></thead>
        <tbody>{(leaves || []).map((l) => (
          <tr key={l.id}><td>{l.from_date} → {l.to_date}</td><td>{l.type}</td>
            <td className="max-w-xs text-xs"><div>{l.reason}</div>{l.review_note && <div className="mt-1 text-slate-500">Review note: {l.review_note}</div>}</td>
            <td><Badge color={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Badge>
              {!!l.leave_request_history?.length && <details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">History ({l.leave_request_history.length})</summary>
                <ul className="mt-1 space-y-1">{[...l.leave_request_history].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((entry) => (
                  <li key={entry.id}>{entry.event === "snapshot" ? `Existing status captured · ${entry.status}` : entry.event === "submitted" ? `Submitted · ${entry.status}` : `${entry.previous_status} → ${entry.status}`} · {new Date(entry.created_at).toLocaleString()}{entry.review_note ? ` · ${entry.review_note}` : ""}</li>
                ))}</ul>
              </details>}
            </td>
            <td>{l.status === "pending" && <form action={deleteLeaveRequest}><input type="hidden" name="id" value={l.id} /><button className="btn-danger btn-sm">Delete</button></form>}</td></tr>))}
        </tbody>
      </table>
      {!leaves?.length && <EmptyState message="No leave requests." />}
    </div></>);
}
