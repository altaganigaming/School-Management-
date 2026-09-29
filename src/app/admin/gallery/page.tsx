import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";
import { addContent, deleteGalleryPhoto } from "@/lib/actions/content";
import { PhotoViewer } from "@/components/photo-viewer";
import { listGalleryImages } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export default async function GalleryAdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_gallery");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: items }, storageImages] = await Promise.all([
    supabase.from("gallery").select("image_url, title"),
    listGalleryImages(1000),
  ]);
  const savedTitles = new Map((items || []).map((item) => [item.image_url, item.title]));
  const photos = storageImages.map((photo) => ({ ...photo, title: savedTitles.get(photo.url) || photo.title }));

  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos shown on the public website." />
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Uploaded.</div>}
      {sp.deleted && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Photo deleted.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "bucket" ? "Gallery storage could not be initialized. Check Supabase Storage and the service-role key." : sp.error === "delete" ? "Photo could not be deleted." : "Photo upload failed. Please check the image and try again."}</div>}
      <form action={addContent.bind(null, "gallery")} encType="multipart/form-data" className="card mb-6 grid gap-4 sm:grid-cols-3">
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Image</span><input name="file" type="file" accept="image/*" className="input" required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Upload Photo</button></div>
      </form>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((g) => (
          <div key={g.name} className="card !p-3">
            <PhotoViewer src={g.url} alt={g.title || "Gallery photo"} caption={g.title} className="w-full rounded-lg" imageClassName="h-36 w-full rounded-lg object-cover" />
            <div className="mt-2 flex items-center justify-between">
              <span className="truncate text-sm">{g.title || "Gallery photo"}</span>
              <form action={deleteGalleryPhoto}><input type="hidden" name="path" value={g.name} />
                <button className="text-xs text-red-500 hover:underline">Delete</button></form>
            </div>
          </div>
        ))}
      </div>
      {!photos.length && <EmptyState message="No photos yet." />}
    </>
  );
}
