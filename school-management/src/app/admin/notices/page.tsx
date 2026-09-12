import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { addContent, deleteContent, toggleNotice } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function NoticesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_notices");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: items } = await supabase.from("notices").select("*").order("published_at", { ascending: false });

  return (
    <>
      <PageHeader title="Notices & News" subtitle="Published on the public website." />
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Published.</div>}
      <form action={addContent.bind(null, "notices")} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="card-title sm:col-span-2 lg:col-span-4">➕ New Notice</h2>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Category</span>
          <select name="category" className="input"><option value="notice">Notice</option><option value="news">News</option><option value="event">Event</option></select></label>
        <div className="flex items-end"><button className="btn-primary w-full">Publish</button></div>
        <label className="block sm:col-span-2 lg:col-span-4"><span className="label">Body</span>
          <textarea name="body" className="input" rows={3} /></label>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {(items || []).map((n: any) => (
              <tr key={n.id}>
                <td className="font-medium">{n.title}</td>
                <td><Badge color="blue">{n.category}</Badge></td>
                <td><Badge color={n.is_published ? "green" : "slate"}>{n.is_published ? "Live" : "Hidden"}</Badge></td>
                <td className="text-xs text-slate-400">{new Date(n.published_at).toLocaleDateString()}</td>
                <td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <form action={toggleNotice}><input type="hidden" name="id" value={n.id} />
                      <button className="btn-secondary btn-sm">{n.is_published ? "Unpublish" : "Publish"}</button></form>
                    <form action={deleteContent.bind(null, "notices")}><input type="hidden" name="id" value={n.id} />
                      <button className="btn-danger btn-sm">Delete</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items?.length && <EmptyState message="No notices yet." />}
      </div>
    </>
  );
}
