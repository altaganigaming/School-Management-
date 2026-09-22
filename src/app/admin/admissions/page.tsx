import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { updateAdmissionStatus } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function AdmissionsPage() {
  await requireAdmin("manage_admissions");
  const admin = createAdminClient();
  const { data: applications } = await admin.from("admission_inquiries").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Admission Applications" subtitle="Review online applications submitted from the public website." />
      <div className="space-y-4">
        {(applications || []).map((application) => (
          <article key={application.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{application.student_name}</h2>
                <p className="text-sm text-slate-500">Applying for: {application.class_name || "Not specified"}</p>
              </div>
              <Badge color={application.status === "new" ? "amber" : application.status === "contacted" ? "blue" : "green"}>{application.status}</Badge>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p><b>Parent:</b> {application.parent_name || "—"}</p>
              <p><b>Phone:</b> {application.phone}</p>
              <p><b>Email:</b> {application.email}</p>
              <p><b>Received:</b> {new Date(application.created_at).toLocaleString()}</p>
            </div>
            {application.message && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{application.message}</p>}
            <form action={updateAdmissionStatus} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={application.id} />
              <label className="text-sm text-slate-500" htmlFor={`status-${application.id}`}>Update status</label>
              <select id={`status-${application.id}`} name="status" defaultValue={application.status} className="input w-auto">
                <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
              <button className="btn-primary btn-sm">Save</button>
            </form>
          </article>
        ))}
        {!applications?.length && <EmptyState message="No online admission applications yet." />}
      </div>
    </>
  );
}
