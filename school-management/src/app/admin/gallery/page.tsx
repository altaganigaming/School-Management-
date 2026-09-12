import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { addContent, deleteContent } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function GalleryAdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_gallery");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: items } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos shown on the public website." />
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Uploaded.</div>}
      <form action={addContent.bind(null, "gallery")} className="card mb-6 grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Image</span><input name="file" type="file" accept="image/*" className="input" required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Upload Photo</button></div>
      </form>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(items || []).map((g: any) => (
          <div key={g.id} className="card !p-3">
            <img src={g.image_url} alt={g.title} className="h-36 w-full rounded-lg object-cover" />
            <div className="mt-2 flex items-center justify-between">
              <span className="truncate text-sm">{g.title}</span>
              <form action={deleteContent.bind(null, "gallery")}><input type="hidden" name="id" value={g.id} />
                <button className="text-xs text-red-500 hover:underline">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
      {!items?.length && <EmptyState message="No photos yet." />}
    </>
  );
}
