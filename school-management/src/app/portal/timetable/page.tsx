import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TimetablePage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: student } = await supabase.from("students").select("class_id").eq("profile_id", profile.id).single();
  const { data: slots } = await supabase.from("timetable").select("*, subjects(name)").eq("class_id", student?.class_id);
  const maxPeriod = Math.max(6, ...(slots || []).map((t) => t.period_no));
  return (<>
    <PageHeader title="Timetable" subtitle="Your weekly class schedule." />
    <div className="card overflow-x-auto">
      <table className="table">
        <thead><tr><th>Day</th>{Array.from({ length: maxPeriod }, (_, i) => <th key={i}>P{i + 1}</th>)}</tr></thead>
        <tbody>
          {DAYS.map((day, di) => (
            <tr key={day}>
              <td className="font-semibold">{day}</td>
              {Array.from({ length: maxPeriod }, (_, pi) => {
                const slot = (slots || []).find((t) => t.day_of_week === di + 1 && t.period_no === pi + 1);
                return (
                  <td key={pi} className="min-w-[100px] text-xs">
                    {slot ? (
                      <div className="rounded-lg bg-primary-50 p-2">
                        <b className="text-primary-800">{slot.subjects?.name ?? "—"}</b>
                        {slot.start_time && <div className="text-slate-400">{String(slot.start_time).slice(0, 5)}–{String(slot.end_time).slice(0, 5)}</div>}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>);
              })}
            </tr>))}
        </tbody>
      </table>
      {!slots?.length && <EmptyState message="Timetable not published yet." />}
    </div></>);
}
