import { PageHeader, EmptyState } from "@/components/ui";
import { PhotoViewer } from "@/components/photo-viewer";
import { addFacultyProfile, deleteFacultyProfile } from "@/lib/actions/faculty";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function FacultyPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();
  const { data: faculty, error: facultyError } = await admin.from("faculty_profiles").select("*").order("display_order").order("name");

  return (
    <>
      <PageHeader title="Faculty" subtitle="Manage the people featured on the school website." />
      {facultyError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Faculty storage is not initialized. Apply the pending faculty migration in Supabase, then reload this page.</div>}
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Faculty profile added to the website.</div>}
      {sp.deleted && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Faculty profile deleted.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "required" ? "Enter a name and choose a photo." : sp.error === "image" ? "Choose an image under 5 MB." : sp.error === "schema" ? "Faculty storage is not initialized. Apply the pending faculty migration in Supabase." : sp.error === "delete" ? "Faculty profile could not be deleted." : "Faculty profile could not be saved. Check Supabase Storage setup."}</div>}

      <form action={addFacultyProfile} encType="multipart/form-data" className="card mb-6 grid gap-4 sm:grid-cols-2">
        <h2 className="card-title sm:col-span-2">Add Faculty Profile</h2>
        <label className="block"><span className="label">Name</span><input name="name" className="input" maxLength={120} required /></label>
        <label className="block"><span className="label">Photo</span><input name="image" type="file" accept="image/*" className="input" required /></label>
        <label className="block sm:col-span-2"><span className="label">Short Description</span><textarea name="description" className="input" rows={3} maxLength={400} placeholder="Role, subject, or a short introduction" /></label>
        <div className="sm:col-span-2"><button className="btn-primary">Save Faculty Profile</button></div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(faculty || []).map((person) => (
          <article key={person.id} className="card flex gap-4">
            <PhotoViewer src={person.image_url} alt={person.name} className="h-20 w-20 shrink-0 rounded-full" imageClassName="h-full w-full rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-slate-900">{person.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{person.description || "No description"}</p>
              <form action={deleteFacultyProfile} className="mt-3">
                <input type="hidden" name="id" value={person.id} />
                <button className="btn-danger btn-sm">Delete</button>
              </form>
            </div>
          </article>
        ))}
      </div>
      {!faculty?.length && <EmptyState message="No faculty profiles have been added yet." />}
    </>
  );
}