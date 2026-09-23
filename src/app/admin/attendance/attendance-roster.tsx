"use client";

import { useMemo, useState } from "react";
import { saveAttendance } from "@/lib/actions/attendance";

type Student = { id: string; roll_no: number | null; profiles: { full_name: string }[] | null };

export default function AttendanceRoster({
  students,
  marked,
  classId,
  date,
  canEdit,
}: {
  students: Student[];
  marked: Record<string, string>;
  classId: string;
  date: string;
  canEdit: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(students.map((student) => [student.id, marked[student.id] === "present" ? "present" : "absent"]))
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students.filter((student) => !term || `${student.profiles?.[0]?.full_name || ""} ${student.roll_no || ""}`.toLowerCase().includes(term));
  }, [query, students]);
  const presentCount = Object.values(statuses).filter((status) => status === "present").length;

  function toggle(studentId: string) {
    if (!canEdit) return;
    setStatuses((current) => ({ ...current, [studentId]: current[studentId] === "present" ? "absent" : "present" }));
  }

  return (
    <form action={saveAttendance} className="card">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="class_id" value={classId} />
      {students.map((student) => <input key={student.id} type="hidden" name="entry" value={`${student.id}:${statuses[student.id]}`} />)}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="card-title">Student roster</h2><p className="text-xs text-slate-500">{presentCount} present of {students.length}</p></div>
        {canEdit && <button type="button" className="btn-secondary" onClick={() => setStatuses(Object.fromEntries(students.map((student) => [student.id, "present"])))}>Mark All Present</button>}
      </div>
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="input mb-4" placeholder="Search by student name or roll number" />
      <div className="space-y-2">
        {filtered.map((student) => {
          const status = statuses[student.id];
          return <button key={student.id} type="button" disabled={!canEdit} onClick={() => toggle(student.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-primary-300 disabled:cursor-default disabled:hover:border-slate-200"><span><span className="mr-3 inline-block w-8 text-xs text-slate-400">{student.roll_no ?? "-"}</span><span className="font-medium text-slate-800">{student.profiles?.[0]?.full_name || "Unnamed student"}</span></span><span className={`badge ${status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{status}</span></button>;
        })}
      </div>
      {!filtered.length && <p className="py-8 text-center text-sm text-slate-400">No matching students.</p>}
      {canEdit ? <button className="btn-primary mt-5">Save Attendance</button> : <p className="mt-5 text-sm text-slate-500">Read-only view. Only Principal/Admin can modify attendance.</p>}
    </form>
  );
}