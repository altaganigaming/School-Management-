import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

async function reviewLeave(formData: FormData) {
  "use server";
  const admin = createAdminClient();
  await admin.from("leave_requests").update({
    status: String(formData.get("status")),
    reviewed_by: String(formData.get("reviewer_id")),
  }).eq("id", String(formData.get("id")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/leave");
}

export default async function LeavePage() {
  const me = await requireAdmin("manage_leave");
  const admin = createAdminClient();
  const { data: leaves } = await admin.from("leave_requests")
    .select("*, profiles(full_name, role)").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Leave Requests" subtitle="Review leave applications from staff, teachers and students." />
      <div className="space-y-3">
        {(leaves || []).map((l) => (
          <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <b>{l.profiles?.full_name}</b>
                <Badge color={l.profiles?.role === "student" ? "blue" : "green"}>{l.profiles?.role}</Badge>
                <Badge color={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-500">{l.type} leave · {l.from_date} → {l.to_date}</div>
              <div className="text-xs text-slate-400">{l.reason}</div>
            </div>
            {l.status === "pending" && (
              <div className="flex gap-2">
                <form action={reviewLeave}>
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="reviewer_id" value={me.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="btn-primary btn-sm">Approve</button>
                </form>
                <form action={reviewLeave}>
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="reviewer_id" value={me.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="btn-danger btn-sm">Reject</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {!leaves?.length && <EmptyState message="No leave requests." />}
      </div>
    </>
  );
}
