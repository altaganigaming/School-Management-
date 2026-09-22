import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const supabase = await createClient();
  const { data: docs } = await supabase.from("documents").select("*").eq("audience", "public").order("created_at", { ascending: false });
  return (
    <>
      <SiteHeader />
      <main className="page-wrap py-16">
        <h1 className="section-title text-center">Downloads</h1>
        <p className="mt-2 text-center text-slate-500">Official school documents, arranged by category.</p>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {[...new Set((docs || []).map((d) => d.category || "general"))].map((category) => (
            <section key={category}>
              <h2 className="mb-3 mt-8 text-lg font-bold capitalize text-slate-800">{category}</h2>
              {(docs || []).filter((d) => (d.category || "general") === category).map((d) => (
            <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
              className="card flex items-center justify-between hover:border-primary-300 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <span className="font-medium text-slate-800">{d.title}</span>
              </div>
              <span className="btn-secondary btn-sm">Download ⭳</span>
            </a>
              ))}
            </section>
          ))}
          {!docs?.length && <p className="py-16 text-center text-slate-400">No documents available yet.</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
