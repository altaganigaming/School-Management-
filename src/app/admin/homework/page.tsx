import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getProfile } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

async function addHomework(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("homework").insert({
    class_id: String(formData.get("class_id")),
    subject_id: String(formData.get("subject_id")) || null,
    title: String(formData.get("title")),
    description: String(formData.get("description")),
    due_date: String(formData.get("due_date")) || null,
    created_by: user?.id,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/homework");
}

async function deleteHomework(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  await supabase.from("homework").delete().eq("id", String(formData.get("id")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/homework");
}

export default async function HomeworkPage() {
  const me = await getProfile();
  await requireAdmin("manage_homework");
  const supabase = await createClient();
  const [{ data: classes }, { data: subjects }, { data: homework }] = await Promise.all([
    supabase.from("classes").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("homework").select("*, classes(name, section), subjects(name)").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Homework" subtitle="Assign homework to classes." />
      <form action={addHomework} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block"><span className="label">Class</span>
          <select name="class_id" className="input" required>
            {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select></label>
        <label className="block"><span className="label">Subject</span>
          <select name="subject_id" className="input">
            <option value="">—</option>
            {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Due Date</span><input name="due_date" type="date" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Assign</button></div>
        <label className="block sm:col-span-2 lg:col-span-5"><span className="label">Teacher note / instructions</span>
          <textarea name="description" className="input" rows={2} /></label>
        <input type="hidden" name="created_by" value={me?.id} />
      </form>

      <div className="space-y-3">
        {(homework || []).map((h) => (
          <div key={h.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><b>{h.title}</b>
                <Badge color="blue">{h.classes?.name} - {h.classes?.section}</Badge>
                {h.subjects && <Badge color="purple">{h.subjects.name}</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{h.description}</p>
              {h.due_date && <p className="text-xs text-amber-600">Due: {h.due_date}</p>}
            </div>
            <form action={deleteHomework}><input type="hidden" name="id" value={h.id} />
              <button className="btn-danger btn-sm">Delete</button></form>
          </div>
        ))}
        {!homework?.length && <EmptyState message="No homework assigned." />}
      </div>
    </>
  );
}
