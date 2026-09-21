import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

async function addExam(formData: FormData) {
  "use server";
  const { createClient: cc } = await import("@/lib/supabase/server");
  const supabase = await cc();
  await supabase.from("exams").insert({
    name: String(formData.get("name")),
    class_id: String(formData.get("class_id")),
    start_date: String(formData.get("start_date")) || null,
    end_date: String(formData.get("end_date")) || null,
  });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/exams");
}

async function addResult(formData: FormData) {
  "use server";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("exam_results").upsert({
    exam_id: String(formData.get("exam_id")),
    student_id: String(formData.get("student_id")),
    subject_id: String(formData.get("subject_id")),
    marks: Number(formData.get("marks")),
    max_marks: Number(formData.get("max_marks") || 100),
  }, { onConflict: "exam_id,student_id,subject_id" });
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/exams");
}

export default async function ExamsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_exams");
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data: classes }, { data: subjects }, { data: exams }, { data: results }] = await Promise.all([
    admin.from("classes").select("*").order("name"),
    admin.from("subjects").select("*").order("name"),
    admin.from("exams").select("*, classes(name, section)").order("start_date", { ascending: false }),
    admin.from("exam_results").select("*, students(profiles(full_name)), subjects(name)"),
  ]);
  const examId = sp.exam_id || exams?.[0]?.id;
  const exam = exams?.find((e) => e.id === examId);
  const { data: classStudents } = exam
    ? await admin.from("students").select("id, profiles(full_name)").eq("class_id", exam.class_id).order("roll_no")
    : { data: [] };

  return (
    <>
      <PageHeader title="Exams & Results" subtitle="Create exams and enter marks per subject." />
      <form action={addExam} className="card mb-6 grid gap-4 sm:grid-cols-5">
        <label className="block"><span className="label">Exam Name</span><input name="name" className="input" placeholder="e.g. Term 1" required /></label>
        <label className="block"><span className="label">Class</span>
          <select name="class_id" className="input" required>
            {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
          </select></label>
        <label className="block"><span className="label">Start</span><input name="start_date" type="date" className="input" /></label>
        <label className="block"><span className="label">End</span><input name="end_date" type="date" className="input" /></label>
        <div className="flex items-end"><button className="btn-primary w-full">Create Exam</button></div>
      </form>

      <div className="card mb-6 overflow-x-auto">
        <h2 className="card-title mb-3">Exams</h2>
        <div className="flex flex-wrap gap-2">
          {(exams || []).map((e) => (
            <a key={e.id} href={`/admin/exams?exam_id=${e.id}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ring-1 ${e.id === examId ? "bg-primary-600 text-white ring-primary-600" : "bg-white text-slate-700 ring-slate-200 hover:ring-primary-300"}`}>
              {e.name} · {e.classes?.name}-{e.classes?.section}
            </a>
          ))}
        </div>
        {!exams?.length && <EmptyState message="No exams created." />}
      </div>

      {exam && (
        <div className="card overflow-x-auto">
          <h2 className="card-title mb-3">Enter Marks — {exam.name}</h2>
          <table className="table">
            <thead><tr><th>Student</th>
              {(subjects || []).map((s) => <th key={s.id} className="text-center">{s.name}</th>)}
            </tr></thead>
            <tbody>
              {(classStudents || []).map((st) => (
                <tr key={st.id}>
                  <td className="font-medium">{st.profiles?.full_name}</td>
                  {(subjects || []).map((sub) => {
                    const existing = results?.find((r) => r.exam_id === examId && r.student_id === st.id && r.subject_id === sub.id);
                    return (
                      <td key={sub.id} className="text-center">
                        <details>
                          <summary className="cursor-pointer text-sm font-semibold text-primary-600">
                            {existing ? `${existing.marks}/${existing.max_marks}` : "—"}
                          </summary>
                          <form action={addResult} className="mt-1 flex gap-1">
                            <input type="hidden" name="exam_id" value={examId} />
                            <input type="hidden" name="student_id" value={st.id} />
                            <input type="hidden" name="subject_id" value={sub.id} />
                            <input name="marks" type="number" step="0.5" defaultValue={existing?.marks} className="input !w-20 !px-2 !py-1" required />
                            <input name="max_marks" type="number" defaultValue={existing?.max_marks ?? 100} className="input !w-16 !px-2 !py-1" required />
                            <button className="btn-primary btn-sm">Save</button>
                          </form>
                        </details>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {!classStudents?.length && <EmptyState message="No students in this exam's class." />}
        </div>
      )}
    </>
  );
}
