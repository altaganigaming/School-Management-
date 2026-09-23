import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function addSlot(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  await supabase.from("timetable").upsert({
    class_id: String(formData.get("class_id")),
    day_of_week: Number(formData.get("day_of_week")),
    period_no: Number(formData.get("period_no")),
    subject_id: String(formData.get("subject_id")) || null,
    teacher_id: String(formData.get("teacher_id")) || null,
    start_time: String(formData.get("start_time")) || null,
    end_time: String(formData.get("end_time")) || null,
  }, { onConflict: "class_id,day_of_week,period_no" });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/timetable");
}

async function deleteSlot(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  await supabase.from("timetable").delete().eq("id", String(formData.get("id")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/timetable");
}

export default async function TimetablePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_timetable");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: classes }, { data: subjects }, { data: teachers }, { data: slots }] = await Promise.all([
    supabase.from("classes").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("teachers").select("id, profiles(full_name)").order("employee_id"),
    supabase.from("timetable").select("*, subjects(name), teachers(profiles(full_name))"),
  ]);
  const classId = sp.class_id || classes?.[0]?.id;
  const mySlots = (slots || []).filter((t) => t.class_id === classId);
  const maxPeriod = Math.max(6, ...mySlots.map((t) => t.period_no));
  const teacherName = (teacher: { profiles?: { full_name?: string } | Array<{ full_name?: string }> | null }) =>
    Array.isArray(teacher.profiles) ? teacher.profiles[0]?.full_name || "Unnamed teacher" : teacher.profiles?.full_name || "Unnamed teacher";

  return (
    <>
      <PageHeader title="Timetable" subtitle="Weekly period schedule per class." />
      <form method="GET" className="card mb-6 flex flex-wrap items-end gap-4">
        <label className="block"><span className="label">Class</span>
          <select name="class_id" className="input" defaultValue={classId}>
            {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select></label>
        <button className="btn-secondary">Load</button>
      </form>

      <form action={addSlot} className="card mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <input type="hidden" name="class_id" value={classId} />
        <label className="block"><span className="label">Day</span>
          <select name="day_of_week" className="input">{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
        <label className="block"><span className="label">Period</span><input name="period_no" type="number" min={1} defaultValue={1} className="input" /></label>
        <label className="block"><span className="label">Subject</span>
          <select name="subject_id" className="input"><option value="">—</option>
            {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="block"><span className="label">Teacher</span>
          <select name="teacher_id" className="input"><option value="">—</option>
            {(teachers || []).map((t) => <option key={t.id} value={t.id}>{teacherName(t)}</option>)}</select></label>
        <label className="block"><span className="label">Start</span><input name="start_time" type="time" className="input" /></label>
        <label className="block"><span className="label">End</span><input name="end_time" type="time" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Set Slot</button></div>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Day</th>{Array.from({ length: maxPeriod }, (_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
          <tbody>
            {DAYS.map((day, di) => (
              <tr key={day}>
                <td className="font-semibold">{day}</td>
                {Array.from({ length: maxPeriod }, (_, pi) => {
                  const slot = mySlots.find((t) => t.day_of_week === di + 1 && t.period_no === pi + 1);
                  return (
                    <td key={pi} className="min-w-[110px]">
                      {slot ? (
                        <div className="rounded-lg bg-primary-50 p-1.5 text-xs">
                          <b className="text-primary-800">{slot.subjects?.name ?? "—"}</b>
                          <div className="text-slate-500">{slot.teachers?.profiles?.full_name ?? ""}</div>
                          <form action={deleteSlot}><input type="hidden" name="id" value={slot.id} />
                            <button className="text-red-500 hover:underline">remove</button></form>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!mySlots.length && <EmptyState message="No slots set for this class." />}
      </div>
    </>
  );
}
