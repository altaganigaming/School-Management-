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
        <p className="mt-2 text-center text-slate-500">Admission forms, prospectus, syllabus and official documents.</p>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {(docs || []).map((d) => (
            <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer"
              className="card flex items-center justify-between hover:border-primary-300 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <span className="font-medium text-slate-800">{d.title}</span>
              </div>
              <span className="btn-secondary btn-sm">Download ⭳</span>
            </a>
          ))}
          {!docs?.length && <p className="py-16 text-center text-slate-400">No documents available yet.</p>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
