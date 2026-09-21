import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { addContent, deleteContent } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_events");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: items } = await supabase.from("events").select("*").order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Events" subtitle="School events visible on the public website." />
      {sp.added && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Added successfully.</div>}

      <form action={addContent.bind(null, "events")} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="card-title sm:col-span-2 lg:col-span-4">➕ Add New</h2>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Event Date</span><input name="event_date" type="date" className="input" required /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Publish</button></div>
        <label className="block sm:col-span-2 lg:col-span-4"><span className="label">Description</span>
          <textarea name="body" className="input" rows={2} /></label>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th className="text-right">Action</th></tr></thead>
          <tbody>
            {(items || []).map((item: any) => (
              <tr key={item.id}>
                <td className="font-medium">{item.title}</td>

                <td className="text-right">
                  <form action={deleteContent.bind(null, "events")}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="btn-danger btn-sm">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items?.length && <EmptyState message="Nothing here yet." />}
      </div>
    </>
  );
}
