import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

async function addClass(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("classes").insert({ name: String(formData.get("name")), section: String(formData.get("section") || "A") });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/classes");
}

async function addSubject(formData: FormData) {
  "use server";
  const supabase = await createClient();
  await supabase.from("subjects").insert({ name: String(formData.get("name")) });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/classes");
}

async function removeRow(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const table = String(formData.get("table")) as "classes" | "subjects";
  await supabase.from(table).delete().eq("id", String(formData.get("id")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/classes");
}

export default async function ClassesPage() {
  await requireAdmin("manage_classes");
  const supabase = await createClient();
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    supabase.from("classes").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Classes & Sections" subtitle="Academic structure." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="card-title">Classes</h2>
          <form action={addClass} className="mt-4 flex gap-2">
            <input name="name" className="input" placeholder="e.g. Class 5" required />
            <input name="section" className="input w-24" placeholder="Sec" defaultValue="A" required />
            <button className="btn-primary shrink-0">Add</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {(classes || []).map((c) => (
              <form key={c.id} action={removeRow} className="flex items-center gap-2">
                <input type="hidden" name="table" value="classes" /><input type="hidden" name="id" value={c.id} />
                <Badge color="blue">{c.name} - {c.section}</Badge>
                <button className="text-xs text-red-500 hover:underline">✕</button>
              </form>
            ))}
            {!classes?.length && <EmptyState message="No classes yet." />}
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Subjects</h2>
          <form action={addSubject} className="mt-4 flex gap-2">
            <input name="name" className="input" placeholder="e.g. Mathematics" required />
            <button className="btn-primary shrink-0">Add</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {(subjects || []).map((s) => (
              <form key={s.id} action={removeRow} className="flex items-center gap-2">
                <input type="hidden" name="table" value="subjects" /><input type="hidden" name="id" value={s.id} />
                <Badge color="purple">{s.name}</Badge>
                <button className="text-xs text-red-500 hover:underline">✕</button>
              </form>
            ))}
            {!subjects?.length && <EmptyState message="No subjects yet." />}
          </div>
        </div>
      </div>
    </>
  );
}
