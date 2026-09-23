import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { addContent, deleteContent } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_documents");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: items } = await supabase.from("documents").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Documents & Downloads" subtitle="Public downloads and private school documents." />
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Uploaded.</div>}
      <form action={addContent.bind(null, "documents")} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="card-title sm:col-span-2 lg:col-span-4">➕ Upload Document</h2>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Audience</span>
          <select name="audience" className="input">
            <option value="public">Public (website downloads)</option>
            <option value="student">Students only</option>
            <option value="teacher">Teachers/Staff only</option>
          </select></label>
        <label className="block"><span className="label">Category</span>
          <select name="category" className="input">
            <option value="general">General</option><option value="prospectus">Prospectus</option><option value="syllabus">Syllabus</option><option value="forms">Forms</option><option value="notices">Notices</option><option value="results">Results</option>
          </select></label>
        <label className="block"><span className="label">File</span><input name="file" type="file" className="input" required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Upload</button></div>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Audience</th><th>File</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {(items || []).map((d: any) => (
              <tr key={d.id}>
                <td className="font-medium">{d.title}</td>
                <td><Badge color="blue">{d.category || "general"}</Badge></td>
                <td><Badge color={d.audience === "public" ? "green" : d.audience === "student" ? "blue" : "purple"}>{d.audience}</Badge></td>
                <td><a href={d.file_url} download={d.title} target="_blank" className="text-sm text-primary-600 underline">Download ⭳</a></td>
                <td className="text-right">
                  <form action={deleteContent.bind(null, "documents")}><input type="hidden" name="id" value={d.id} />
                    <button className="btn-danger btn-sm">Delete</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items?.length && <EmptyState message="No documents yet." />}
      </div>
    </>
  );
}
