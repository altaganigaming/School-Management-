import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getSettings } from "@/lib/auth";
import { listGalleryImages } from "@/lib/gallery";
import { PhotoViewer } from "@/components/photo-viewer";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const s = await getSettings();
  const items = await listGalleryImages();
  return (
    <>
      <SiteHeader />
      <main className="page-wrap py-16">
        <h1 className="section-title text-center">Photo Gallery</h1>
        <p className="mt-2 text-center text-slate-500">Life at {s.school_name}</p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((g) => (
            <figure key={g.name} className="group relative overflow-hidden rounded-xl">
              <PhotoViewer src={g.url} alt={g.title || s.school_name} caption={g.title} className="h-64 w-full" imageClassName="h-full w-full object-cover transition group-hover:scale-105" />
              {g.title && <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-medium text-white">{g.title}</figcaption>}
            </figure>
          ))}
        </div>
        {!items.length && <p className="py-16 text-center text-slate-400">No photos uploaded yet.</p>}
      </main>
      <SiteFooter />
    </>
  );
}
