import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  await requireStudent();
  const supabase = await createClient();
  const { data: items } = await supabase.from("documents").select("*").in("audience", ["public", "student"]).order("created_at", { ascending: false });
  return (<>
    <PageHeader title="Documents" subtitle="Official documents shared with students." />
    <div className="space-y-3">
      {(items || []).map((d) => (
        <a key={d.id} href={d.file_url} download={d.title} target="_blank" className="card flex items-center justify-between hover:shadow-md transition">
          <div className="flex items-center gap-3"><span className="text-2xl">📄</span>
            <div><div className="font-medium">{d.title}</div>
              <Badge color={d.audience === "student" ? "blue" : "green"}>{d.audience}</Badge></div></div>
          <span className="btn-secondary btn-sm">Download ⭳</span>
        </a>))}
      {!items?.length && <EmptyState message="No documents available." />}
    </div></>);
}
