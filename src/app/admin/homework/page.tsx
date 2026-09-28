import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

async function addHomework(formData: FormData) {
  "use server";
  const { requireAdmin: require } = await import("@/lib/auth");
  const profile = await require("manage_homework");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const classId = String(formData.get("class_id"));
  const subjectId = String(formData.get("subject_id") || "");
  if (profile.role === "teacher") {
    const { data: teacher } = await admin.from("teachers").select("assigned_classes, assigned_subjects").eq("profile_id", profile.id).single();
    const assignedClasses = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
    const assignedSubjects = Array.isArray(teacher?.assigned_subjects) ? teacher.assigned_subjects.map(String) : [];
    if (!assignedClasses.includes(classId) || (assignedSubjects.length && subjectId && !assignedSubjects.includes(subjectId))) return;
  }
  const { data: classRecord } = await admin.from("classes").select("id").eq("id", classId).maybeSingle();
  if (!classRecord) return;
  const { error } = await admin.from("homework").insert({
    class_id: classId,
    subject_id: subjectId || null,
    title: String(formData.get("title")),
    description: String(formData.get("description")),
    due_date: String(formData.get("due_date")) || null,
    created_by: profile.id,
  });
  if (error) return;
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/homework");
  revalidatePath("/portal/homework");
  revalidatePath("/portal");
}

async function deleteHomework(formData: FormData) {
  "use server";
  const { requireAdmin: require } = await import("@/lib/auth");
  const profile = await require("manage_homework");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const { data: item } = await admin.from("homework").select("id, class_id, created_by").eq("id", id).maybeSingle();
  if (!item) return;
  if (profile.role === "teacher") {
    const { data: teacher } = await admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).single();
    const assignedClasses = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
    if (item.created_by !== profile.id || !assignedClasses.includes(item.class_id)) return;
  }
  await admin.from("homework").delete().eq("id", id);
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/homework");
  revalidatePath("/portal/homework");
  revalidatePath("/portal");
}

export default async function HomeworkPage() {
  const me = await requireAdmin("manage_homework");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const [{ data: classes }, { data: subjects }, { data: homework }, { data: teacher }] = await Promise.all([
    admin.from("classes").select("*").order("name"),
    admin.from("subjects").select("*").order("name"),
    admin.from("homework").select("*, classes(name, section), subjects(name)").order("created_at", { ascending: false }),
    me.role === "teacher" ? admin.from("teachers").select("assigned_classes, assigned_subjects").eq("profile_id", me.id).single() : Promise.resolve({ data: null }),
  ]);
  const visibleClasses = me?.role === "teacher"
    ? classes?.filter((c) => (Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : []).includes(c.id))
    : classes;
  const assignedSubjectIds = Array.isArray(teacher?.assigned_subjects) ? teacher.assigned_subjects.map(String) : [];
  const visibleSubjects = me.role === "teacher" && assignedSubjectIds.length
    ? subjects?.filter((subject) => assignedSubjectIds.includes(subject.id))
    : subjects;
  const visibleHomework = me.role === "teacher"
    ? (homework || []).filter((item) => visibleClasses?.some((classItem) => classItem.id === item.class_id))
    : homework;

  return (
    <>
      <PageHeader title="Homework" subtitle="Assign homework to classes." />
      <form action={addHomework} className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block"><span className="label">Class</span>
          <select name="class_id" className="input" required>
            {(visibleClasses || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select></label>
        <label className="block"><span className="label">Subject</span>
          <select name="subject_id" className="input">
            <option value="">—</option>
            {(visibleSubjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="label">Title</span><input name="title" className="input" required /></label>
        <label className="block"><span className="label">Due Date</span><input name="due_date" type="date" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Assign</button></div>
        <label className="block sm:col-span-2 lg:col-span-5"><span className="label">Teacher note / instructions</span>
          <textarea name="description" className="input" rows={2} /></label>
        <input type="hidden" name="created_by" value={me?.id} />
      </form>

      <div className="space-y-3">
        {(visibleHomework || []).map((h) => (
          <div key={h.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><b>{h.title}</b>
                <Badge color="blue">{h.classes?.name} - {h.classes?.section}</Badge>
                {h.subjects && <Badge color="purple">{h.subjects.name}</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-500">{h.description}</p>
              {h.due_date && <p className="text-xs text-amber-600">Due: {h.due_date}</p>}
            </div>
            {(me.role !== "teacher" || h.created_by === me.id) && <form action={deleteHomework}><input type="hidden" name="id" value={h.id} />
              <button className="btn-danger btn-sm">Delete</button></form>}
          </div>
        ))}
        {!homework?.length && <EmptyState message="No homework assigned." />}
      </div>
    </>
  );
}
