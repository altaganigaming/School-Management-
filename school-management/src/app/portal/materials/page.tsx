import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("class_id").eq("profile_id", profile.id).single();
  const { data: items } = await supabase.from("study_materials")
    .select("*, subjects(name), classes(name, section)").or(`class_id.is.null,class_id.eq.${student?.class_id}`).order("created_at", { ascending: false });
  return (<>
    <PageHeader title="Study Materials" subtitle="Notes and resources shared by your teachers." />
    <div className="space-y-3">
      {(items || []).map((m) => (
        <div key={m.id} className="card">
          <div className="flex flex-wrap items-center gap-2"><b>{m.title}</b>
            {m.classes && <Badge color="blue">{m.classes.name}-{m.classes.section}</Badge>}
            {m.subjects && <Badge color="purple">{m.subjects.name}</Badge>}</div>
          <p className="mt-1 text-sm text-slate-500">{m.description}</p>
          {m.file_url && <a href={m.file_url} target="_blank" className="text-sm text-primary-600 underline">Download ⭳</a>}
        </div>))}
      {!items?.length && <EmptyState message="No materials uploaded yet." />}
    </div></>);
}
