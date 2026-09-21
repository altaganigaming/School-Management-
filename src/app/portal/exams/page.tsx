import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("id, class_id").eq("profile_id", profile.id).single();
  const { data: exams } = await supabase.from("exams").select("*").eq("class_id", student?.class_id).order("start_date", { ascending: false });
  const { data: results } = await supabase.from("exam_results").select("*, subjects(name)").eq("student_id", student?.id);
  return (<>
    <PageHeader title="Exams & Results" subtitle="Your exam schedule and marks." />
    <div className="space-y-6">
      {(exams || []).map((e) => {
        const my = (results || []).filter((r) => r.exam_id === e.id);
        const total = my.reduce((a, b) => a + Number(b.marks), 0);
        const max = my.reduce((a, b) => a + Number(b.max_marks), 0);
        return (
          <div key={e.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="card-title">{e.name}</h2>
              <span className="text-sm text-slate-500">{e.start_date} → {e.end_date}</span>
            </div>
            {my.length > 0 ? (
              <>
                <table className="table mt-3">
                  <thead><tr><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead>
                  <tbody>{my.map((r) => (
                    <tr key={r.id}><td>{r.subjects?.name}</td>
                      <td className="font-semibold">{r.marks} / {r.max_marks}</td>
                      <td className="text-primary-600 font-bold">{r.grade || "—"}</td></tr>))}
                  </tbody>
                </table>
                <div className="mt-3 rounded-xl bg-primary-50 p-3 text-sm">
                  Total: <b>{total} / {max}</b> ({max ? Math.round((total / max) * 100) : 0}%)
                </div>
              </>) : <p className="mt-2 text-sm text-slate-400">Results not published yet.</p>}
          </div>);
      })}
      {!exams?.length && <EmptyState message="No exams scheduled." />}
    </div></>);
}
