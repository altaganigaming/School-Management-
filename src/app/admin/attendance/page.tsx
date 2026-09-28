import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import AttendanceRoster from "./attendance-roster";

export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireAdmin();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const requestedDate = sp.date || today;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && !Number.isNaN(Date.parse(`${requestedDate}T00:00:00`)) ? requestedDate : today;
  const admin = createAdminClient();
  const [{ data: allClasses }, teacherResult] = await Promise.all([
    admin.from("classes").select("id, name, section").order("name").order("section"),
    profile.role === "teacher"
      ? admin.from("teachers").select("id, assigned_classes").eq("profile_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const assignedIds = Array.isArray(teacherResult.data?.assigned_classes)
    ? teacherResult.data.assigned_classes.map(String)
    : [];
  const availableClasses = profile.role === "teacher"
    ? (allClasses || []).filter((item) => assignedIds.includes(item.id))
    : allClasses || [];
  const requestedClassId = sp.class_id || (profile.role === "teacher" ? "" : "all");
  const selectedClassId = profile.role === "teacher"
    ? (availableClasses.some((item) => item.id === requestedClassId) ? requestedClassId : availableClasses[0]?.id || "")
    : requestedClassId === "all" || availableClasses.some((item) => item.id === requestedClassId) ? requestedClassId : "all";
  const selectedClass = availableClasses.find((item) => item.id === selectedClassId);
  let studentsQuery = admin.from("students").select("id, profile_id, admission_no, roll_no, class_id").not("class_id", "is", null).order("class_id").order("roll_no");
  if (selectedClassId !== "all") studentsQuery = studentsQuery.eq("class_id", selectedClassId);
  const { data: students } = selectedClassId || profile.role !== "teacher" ? await studentsQuery : { data: [] };
  const studentIds = (students || []).map((student) => student.id);
  const profileIds = [...new Set((students || []).map((student) => student.profile_id).filter(Boolean))];
  const [{ data: studentProfiles }, { data: attendanceRows }] = await Promise.all([
    profileIds.length ? admin.from("profiles").select("id, full_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    studentIds.length ? admin.from("attendance").select("student_id, status, marked_by, date").eq("date", date).in("student_id", studentIds) : Promise.resolve({ data: [] }),
  ]);
  const profileNames = new Map((studentProfiles || []).map((item) => [item.id, item.full_name]));
  const roster = (students || []).map((student) => ({
    ...student,
    full_name: profileNames.get(student.profile_id || "") || student.admission_no || "Unnamed student",
  }));
  const markedMap = Object.fromEntries((attendanceRows || []).map((row) => [row.student_id, row.status]));
  const classLabels = new Map((allClasses || []).map((item) => [item.id, `${item.name} - ${item.section}`]));
  const submissionGroups = new Map<string, { classId: string; markerId: string | null; rows: Map<string, string> }>();
  const studentClasses = new Map(roster.map((student) => [student.id, student.class_id]));
  for (const row of attendanceRows || []) {
    const rowClassId = studentClasses.get(row.student_id);
    if (!rowClassId) continue;
    const markerId = row.marked_by || null;
    const key = `${rowClassId}:${markerId || "unknown"}`;
    if (!submissionGroups.has(key)) submissionGroups.set(key, { classId: rowClassId, markerId, rows: new Map() });
    submissionGroups.get(key)!.rows.set(row.student_id, row.status);
  }
  const markerIds = [...new Set([...submissionGroups.values()].map((group) => group.markerId).filter((id): id is string => Boolean(id)))];
  const { data: markers } = markerIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", markerIds)
    : { data: [] };
  const markerNames = new Map((markers || []).map((marker) => [marker.id, marker.full_name]));
  const statusMap = Object.fromEntries((attendanceRows || []).map((row) => [row.student_id, row.status]));
  return (
    <>
      <PageHeader title="Attendance" subtitle={profile.role === "teacher" ? "Take attendance for your assigned classes." : "Review attendance submitted by teachers."} />
      {sp.saved && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Attendance saved for {date}.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "class" ? "That class is not assigned to your account." : sp.error === "empty" ? "No students are assigned to this class." : "Attendance could not be loaded or saved. Check the date and try again."}</div>}
      <form method="GET" className="card mb-6 flex flex-wrap items-end gap-4">
        <label className="block"><span className="label">Class / Section</span>
          <select name="class_id" className="input" defaultValue={selectedClassId} required>
            {profile.role !== "teacher" && <option value="all">All classes</option>}
            {availableClasses.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}
          </select>
        </label>
        <label className="block"><span className="label">Attendance date</span><input type="date" name="date" defaultValue={date} className="input" required /></label>
        <button className="btn-secondary">Load Attendance</button>
      </form>
      {profile.role === "teacher" ? (
        selectedClassId
          ? <AttendanceRoster students={roster} marked={statusMap} classId={selectedClassId} date={date} canEdit />
          : <EmptyState message="No classes are assigned to your teacher account. Ask the principal to assign your classes." />
      ) : (
        <div className="space-y-6">
          {[...submissionGroups.entries()].map(([key, group]) => {
            const groupStudents = roster.filter((student) => student.class_id === group.classId);
            const present = [...group.rows.values()].filter((status) => status === "present").length;
            const absent = [...group.rows.values()].filter((status) => status === "absent").length;
            return <section key={key} className="card overflow-x-auto">
              <h2 className="card-title">{classLabels.get(group.classId) || "Class"} · {date}</h2>
              <p className="mt-1 text-sm text-slate-500">Submitted by <b className="text-slate-800">{group.markerId ? markerNames.get(group.markerId) || "Unknown teacher" : "Unknown teacher"}</b> · {present} present · {absent} absent</p>
              <table className="table mt-4">
                <thead><tr><th>Roll No.</th><th>Student</th><th>Status</th></tr></thead>
                <tbody>{groupStudents.map((student) => {
                  const status = group.rows.get(student.id);
                  return <tr key={student.id}><td className="font-mono text-xs">{student.roll_no ?? "—"}</td><td className="font-medium">{student.full_name}</td><td>{status ? <Badge color={status === "present" ? "green" : status === "absent" ? "red" : "amber"}>{status}</Badge> : <span className="text-slate-400">Not recorded</span>}</td></tr>;
                })}</tbody>
              </table>
            </section>;
          })}
          {!submissionGroups.size && <EmptyState message={`No attendance has been submitted for ${selectedClassId === "all" ? "any class" : classLabels.get(selectedClassId) || "this class"} on ${date}.`} />}
        </div>
      )}
    </>
  );
}
