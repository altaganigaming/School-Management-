import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  await requireStudent();
  const supabase = await createClient();
  const { data: items } = await supabase.from("notices").select("*").eq("is_published", true).order("published_at", { ascending: false });
  return (<>
    <PageHeader title="Notices & News" />
    <div className="space-y-3">
      {(items || []).map((n) => (
        <div key={n.id} className="card">
          <div className="flex items-center gap-2"><Badge color="blue">{n.category}</Badge>
            <span className="text-xs text-slate-400">{new Date(n.published_at).toLocaleDateString()}</span></div>
          <h3 className="mt-1 font-bold text-slate-900">{n.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{n.body}</p>
          {n.attachment_url && <a href={n.attachment_url} target="_blank" className="text-sm text-primary-600 underline">Attachment ⭳</a>}
        </div>))}
      {!items?.length && <EmptyState message="No notices yet." />}
    </div></>);
}
