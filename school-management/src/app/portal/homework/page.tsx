import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomeworkPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("class_id").eq("profile_id", profile.id).single();
  const { data: items } = await supabase.from("homework")
    .select("*, subjects(name)").eq("class_id", student?.class_id).order("due_date", { ascending: false });
  return (<>
    <PageHeader title="Homework" subtitle="Assignments for your class." />
    <div className="space-y-3">
      {(items || []).map((h) => (
        <div key={h.id} className="card">
          <div className="flex flex-wrap items-center gap-2"><b>{h.title}</b>
            {h.subjects && <Badge color="purple">{h.subjects.name}</Badge>}
            {h.due_date && <Badge color="amber">Due {h.due_date}</Badge>}</div>
          <p className="mt-1 text-sm text-slate-500">{h.description}</p>
          {h.attachment_url && <a href={h.attachment_url} target="_blank" className="text-sm text-primary-600 underline">Attachment ⭳</a>}
        </div>))}
      {!items?.length && <EmptyState message="No homework assigned." />}
    </div></>);
}
