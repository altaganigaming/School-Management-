import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import AttendanceRoster from "./attendance-roster";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireAdmin();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const date = sp.date || today;
  const fromDate = sp.from || date;
  const toDate = sp.to || date;
  const admin = createAdminClient();
  const [{ data: allClasses }, { data: teacher }] = await Promise.all([
    admin.from("classes").select("id, name, section").order("name").order("section"),
    profile.role === "teacher" ? admin.from("teachers").select("assigned_classes").eq("profile_id", profile.id).single() : Promise.resolve({ data: null }),
  ]);
  const assigned = profile.role === "teacher" ? ((teacher?.assigned_classes || []) as string[]) : null;
  const classes = assigned ? (allClasses || []).filter((item) => assigned.includes(item.id)) : allClasses || [];
  const classId = sp.class_id && (!assigned || assigned.includes(sp.class_id)) ? sp.class_id : classes[0]?.id || "";
  const [{ data: students }, { data: marked }] = await Promise.all([
    admin.from("students").select("id, roll_no, profiles(full_name), class_id").eq("class_id", classId).order("roll_no"),
    admin.from("attendance").select("student_id, status").eq("date", date),
  ]);
  const studentIds = (students || []).map((student) => student.id);
  const { data: records } = studentIds.length
    ? await admin.from("attendance").select("student_id, date, status").in("student_id", studentIds).gte("date", fromDate).lte("date", toDate)
    : { data: [] };
  const markedMap = Object.fromEntries((marked || []).filter((row) => studentIds.includes(row.student_id)).map((row) => [row.student_id, row.status]));
  const studentTotals = new Map(studentIds.map((id) => [id, { present: 0, absent: 0 }]));
  const { data: allStudents } = profile.role !== "teacher"
    ? await admin.from("students").select("id, class_id, profiles(full_name)").not("class_id", "is", null).order("class_id").order("roll_no")
    : { data: [] };
  const allStudentIds = (allStudents || []).map((student) => student.id);
  const { data: allMarked } = allStudentIds.length
    ? await admin.from("attendance").select("student_id, status").eq("date", date).in("student_id", allStudentIds)
    : { data: [] };
  const monitorStatusMap = new Map((allMarked || []).map((row) => [row.student_id, row.status]));
  const classSummary = (allClasses || []).map((item) => {
    const classStudents = (allStudents || []).filter((student) => student.class_id === item.id);
    const present = classStudents.filter((student) => monitorStatusMap.get(student.id) === "present").length;
    const absent = classStudents.filter((student) => monitorStatusMap.get(student.id) === "absent").length;
    return {
      id: item.id,
      label: `${item.name} - ${item.section}`,
      present,
      absent,
      total: classStudents.length,
    };
  });
  const monitorRows = (allStudents || [])
    .filter((student) => monitorStatusMap.has(student.id))
    .map((student) => {
      const classInfo = allClasses?.find((item) => item.id === student.class_id);
      const status = monitorStatusMap.get(student.id);
      return {
        classLabel: classInfo ? `${classInfo.name} - ${classInfo.section}` : "Unassigned",
        studentName: Array.isArray(student.profiles) ? student.profiles[0]?.full_name || "Unnamed student" : student.profiles?.full_name || "Unnamed student",
        status: status || "absent",
      };
    })
    .sort((a, b) => a.classLabel.localeCompare(b.classLabel) || a.studentName.localeCompare(b.studentName));
  (records || []).forEach((record) => {
    const total = studentTotals.get(record.student_id);
    if (total && record.status === "present") total.present += 1;
    if (total && record.status === "absent") total.absent += 1;
  });
  const present = (records || []).filter((record) => record.status === "present").length;
  const absent = (records || []).filter((record) => record.status === "absent").length;
  const total = present + absent;
  const classLabel = classes.find((item) => item.id === classId);
  const getStudentName = (student: { profiles?: { full_name?: string } | Array<{ full_name?: string }> | null }) =>
    Array.isArray(student.profiles) ? student.profiles[0]?.full_name || "-" : student.profiles?.full_name || "-";
  return (
    <>
      <PageHeader title="Attendance" subtitle={`${classLabel ? `${classLabel.name} - ${classLabel.section} · ` : ""}${date === today ? "Today" : date}${profile.role === "teacher" ? " · Assigned class" : ""}`} />
      <form method="GET" className="card mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label><span className="label">Class / Section</span><select name="class_id" className="input" defaultValue={classId}>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}</select></label>
        <label><span className="label">Attendance date</span><input type="date" name="date" defaultValue={date} className="input" /></label>
        <label><span className="label">Session</span><input value="Full day" readOnly className="input bg-slate-50" /></label>
        <label><span className="label">Report from</span><input type="date" name="from" defaultValue={fromDate} className="input" /></label>
        <label><span className="label">Report to</span><input type="date" name="to" defaultValue={toDate} className="input" /></label>
        <button className="btn-secondary self-end">Load attendance</button>
      </form>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Present', present, 'text-emerald-600'], ['Absent', absent, 'text-red-600'], ['Marked', total, 'text-slate-700'], ['Percentage', total ? `${Math.round((present / total) * 100)}%` : "0%", 'text-primary-600']].map(([label, value, color]) => <div key={String(label)} className="card"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div></div>)}
      </div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        {profile.role === "teacher" ? <AttendanceRoster students={(students || []) as any} marked={markedMap} classId={classId} date={date} canEdit /> : <div className="card"><h2 className="card-title mb-2">Principal monitoring view</h2><p className="text-sm text-slate-500">Submitted attendance for {date}. Class and section totals are updated from teacher submissions.</p><div className="mt-4 overflow-x-auto"><table className="table"><thead><tr><th>Class / Section</th><th>Present</th><th>Absent</th><th>Total</th></tr></thead><tbody>{classSummary.map((item) => <tr key={item.id}><td className="font-medium">{item.label}</td><td><Badge color="green">{item.present}</Badge></td><td><Badge color="red">{item.absent}</Badge></td><td>{item.total}</td></tr>)}</tbody></table></div><div className="mt-5 overflow-x-auto"><h3 className="mb-2 text-sm font-semibold text-slate-700">Submitted student list</h3>{monitorRows.length ? <table className="table"><thead><tr><th>Class / Section</th><th>Student</th><th>Status</th></tr></thead><tbody>{monitorRows.map((row) => <tr key={`${row.classLabel}-${row.studentName}`}><td>{row.classLabel}</td><td>{row.studentName}</td><td><Badge color={row.status === "present" ? "green" : "red"}>{row.status === "present" ? "Present" : "Absent"}</Badge></td></tr>)}</tbody></table> : <p className="py-8 text-center text-sm text-slate-400">No attendance submitted yet for this date.</p>}</div></div>}
        <div className="card overflow-x-auto"><h2 className="card-title mb-3">Student-wise report</h2><p className="mb-4 text-xs text-slate-500">{fromDate} to {toDate}</p><table className="table"><thead><tr><th>Student</th><th>P</th><th>A</th><th>%</th></tr></thead><tbody>{(students || []).map((student) => { const item = studentTotals.get(student.id) || { present: 0, absent: 0 }; const count = item.present + item.absent; return <tr key={student.id}><td className="font-medium">{getStudentName(student)}</td><td><Badge color="green">{item.present}</Badge></td><td><Badge color="red">{item.absent}</Badge></td><td>{count ? `${Math.round((item.present / count) * 100)}%` : "-"}</td></tr>; })}</tbody></table>{!students?.length && <p className="py-8 text-center text-sm text-slate-400">No students in this class.</p>}</div>
      </div>
    </>
  );
}
