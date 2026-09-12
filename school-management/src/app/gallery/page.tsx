import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const s = await getSettings();
  const supabase = await createClient();
  const { data: items } = await supabase.from("gallery").select("*").order("created_at", { ascending: false });
  return (
    <>
      <SiteHeader />
      <main className="page-wrap py-16">
        <h1 className="section-title text-center">Photo Gallery</h1>
        <p className="mt-2 text-center text-slate-500">Life at {s.school_name}</p>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3">
          {(items || []).map((g) => (
            <figure key={g.id} className="group relative overflow-hidden rounded-xl">
              <img src={g.image_url} alt={g.title} className="h-64 w-full object-cover transition group-hover:scale-105" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-medium text-white">
                {g.title}
              </figcaption>
            </figure>
          ))}
        </div>
        {!items?.length && <p className="py-16 text-center text-slate-400">No photos uploaded yet.</p>}
      </main>
      <SiteFooter />
    </>
  );
}
