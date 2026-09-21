import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { uploadFile } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function addMaterial(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  const { data: { user } } = await supabase.auth.getUser();
  let fileUrl = null;
  const file = formData.get("file") as File;
  if (file && file.size > 0) {
    const path = `${Date.now()}-${file.name}`;
    await supabase.storage.from("documents").upload(path, file);
    fileUrl = supabase.storage.from("documents").getPublicUrl(path).data.publicUrl;
  }
  await supabase.from("study_materials").insert({
    class_id: String(formData.get("class_id")) || null,
    subject_id: String(formData.get("subject_id")) || null,
    title: String(formData.get("title")),
    description: String(formData.get("description")),
    file_url: fileUrl,
    created_by: user?.id,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/materials");
}

async function deleteMaterial(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  await supabase.from("study_materials").delete().eq("id", String(formData.get("id")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/materials");
}

export default async function MaterialsPage() {
  await requireAdmin("manage_materials");
  const supabase = await createClient();
  const [{ data: classes }, { data: subjects }, { data: materials }] = await Promise.all([
    supabase.from("classes").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("study_materials").select("*, classes(name, section), subjects(name)").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Study Materials" subtitle="Share notes and files with classes (or all classes)." />
      <form action={addMaterial} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block"><span className="label">Class (blank = all)</span>
          <select name="class_id" className="input"><option value="">All Classes</option>
            {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select></label>
        <label className="block"><span className="label">Subject</span>
          <select name="subject_id" className="input"><option value="">—</option>
            {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">File (optional)</span><input name="file" type="file" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Upload</button></div>
        <label className="block sm:col-span-2 lg:col-span-5"><span className="label">Description</span>
          <textarea name="description" className="input" rows={2} /></label>
      </form>

      <div className="space-y-3">
        {(materials || []).map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><b>{m.title}</b>
                <Badge color="blue">{m.classes ? `${m.classes.name}-${m.classes.section}` : "All classes"}</Badge>
                {m.subjects && <Badge color="purple">{m.subjects.name}</Badge>}
              </div>
              <p className="text-sm text-slate-500">{m.description}</p>
              {m.file_url && <a href={m.file_url} target="_blank" className="text-sm text-primary-600 underline">Download file ⭳</a>}
            </div>
            <form action={deleteMaterial}><input type="hidden" name="id" value={m.id} />
              <button className="btn-danger btn-sm">Delete</button></form>
          </div>
        ))}
        {!materials?.length && <EmptyState message="No materials uploaded." />}
      </div>
    </>
  );
}
