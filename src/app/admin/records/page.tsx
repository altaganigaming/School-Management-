import { DownloadPdfButton } from "@/components/download-pdf-button";
import { Badge, PageHeader } from "@/components/ui";
import { requireSuperAdmin, getSettings } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function fetchAll<T>(loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await loadPage(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function printDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("en-IN") : "—";
}

export default async function AdminRecordsPage() {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const settings = await getSettings();
  const [students, feeRows, attendanceRows, leaveRows, profiles, classes] = await Promise.all([
    fetchAll((from, to) => admin.from("students").select("id, profile_id, admission_no, class_id").order("admission_no").range(from, to)),
    fetchAll((from, to) => admin.from("fee_records").select("student_id, month, amount, status, paid_at").order("month", { ascending: false }).range(from, to)),
    fetchAll((from, to) => admin.from("attendance").select("student_id, date, status, note").order("date", { ascending: false }).range(from, to)),
    fetchAll((from, to) => admin.from("leave_requests").select("profile_id, from_date, to_date, type, reason, status, review_note, created_at").order("created_at", { ascending: false }).range(from, to)),
    fetchAll((from, to) => admin.from("profiles").select("id, full_name, role").order("full_name").range(from, to)),
    fetchAll((from, to) => admin.from("classes").select("id, name, section").order("name").range(from, to)),
  ]);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const classById = new Map(classes.map((item) => [item.id, `${item.name} - ${item.section}`]));
  const feesByStudent = new Map<string, typeof feeRows>();
  for (const fee of feeRows) {
    const rows = feesByStudent.get(fee.student_id) || [];
    rows.push(fee);
    feesByStudent.set(fee.student_id, rows);
  }
  const paidTotal = feeRows.filter((fee) => fee.status === "paid").reduce((sum, fee) => sum + Number(fee.amount), 0);
  const pendingTotal = feeRows.filter((fee) => fee.status === "pending").reduce((sum, fee) => sum + Number(fee.amount), 0);
  const presentCount = attendanceRows.filter((row) => row.status === "present").length;
  const attendanceRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0;
  const generatedAt = new Date().toLocaleString("en-IN");

  return (
    <>
      <div className="print-hidden">
        <PageHeader title="School Records" subtitle="Current active leave, fee, and attendance records." />
        <DownloadPdfButton />
        <p className="mt-2 text-xs text-slate-500">In the print dialog, choose Save as PDF for a downloadable copy.</p>
      </div>
      <main className="print-document mx-auto max-w-6xl space-y-6 text-slate-900">
        <header className="border-b border-slate-300 pb-3">
          <h1 className="text-xl font-bold">{settings.school_name || "School"} · Current Records</h1>
          <p className="mt-1 text-xs text-slate-500">Generated {generatedAt} · Deleted leave requests are excluded.</p>
          <p className="mt-2 text-xs">{leaveRows.length} active leave · {students.length} students · {feeRows.length} fee entries · {attendanceRows.length} attendance entries</p>
        </header>

        <section className="break-inside-avoid">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold">Leave Requests</h2>
          <table className="w-full border-collapse text-[9px]">
            <thead><tr className="border-b border-slate-300 text-left"><th className="p-1">Applicant</th><th className="p-1">Role</th><th className="p-1">Dates</th><th className="p-1">Type / Reason</th><th className="p-1">Status</th><th className="p-1">Review note</th></tr></thead>
            <tbody>{leaveRows.map((leave, index) => {
              const applicant = profileById.get(leave.profile_id);
              return <tr key={`${leave.profile_id}-${leave.created_at}-${index}`} className="border-b border-slate-200 align-top">
                <td className="p-1">{applicant?.full_name || "Name unavailable"}</td>
                <td className="p-1 capitalize">{applicant?.role || "—"}</td>
                <td className="whitespace-nowrap p-1">{printDate(leave.from_date)}–{printDate(leave.to_date)}</td>
                <td className="p-1">{leave.type}: {leave.reason || "—"}</td>
                <td className="p-1 capitalize">{leave.status}</td>
                <td className="p-1">{leave.review_note || "—"}</td>
              </tr>;
            })}</tbody>
          </table>
          {!leaveRows.length && <p className="py-2 text-xs text-slate-500">No active leave requests.</p>}
        </section>

        <section className="break-inside-avoid">
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold">Student Fee Summary</h2>
          <p className="mb-2 text-xs">Paid total: {formatCurrency(paidTotal)} · Pending total: {formatCurrency(pendingTotal)}</p>
          <table className="w-full border-collapse text-[9px]">
            <thead><tr className="border-b border-slate-300 text-left"><th className="p-1">Student</th><th className="p-1">Admission No.</th><th className="p-1">Class</th><th className="p-1">Paid</th><th className="p-1">Pending</th><th className="p-1">Months</th></tr></thead>
            <tbody>{students.map((student) => {
              const fees = feesByStudent.get(student.id) || [];
              const paid = fees.filter((fee) => fee.status === "paid").reduce((sum, fee) => sum + Number(fee.amount), 0);
              const pending = fees.filter((fee) => fee.status === "pending").reduce((sum, fee) => sum + Number(fee.amount), 0);
              return <tr key={student.id} className="border-b border-slate-200">
                <td className="p-1">{profileById.get(student.profile_id || "")?.full_name || "Name unavailable"}</td>
                <td className="p-1">{student.admission_no}</td>
                <td className="p-1">{classById.get(student.class_id || "") || "—"}</td>
                <td className="p-1">{formatCurrency(paid)}</td>
                <td className="p-1">{formatCurrency(pending)}</td>
                <td className="p-1">{fees.length}</td>
              </tr>;
            })}</tbody>
          </table>
          <div className="mt-2 flex gap-3 text-[9px]"><Badge color="green">Paid</Badge><Badge color="amber">Pending</Badge><span>Monthly fee records include their current status in the summary above.</span></div>
        </section>

        <section>
          <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-bold">Attendance Records</h2>
          <p className="mb-2 text-xs">Present: {presentCount} / {attendanceRows.length} · Present rate: {attendanceRate}%</p>
          <table className="w-full border-collapse text-[9px]">
            <thead><tr className="border-b border-slate-300 text-left"><th className="p-1">Date</th><th className="p-1">Student</th><th className="p-1">Admission No.</th><th className="p-1">Class</th><th className="p-1">Status</th><th className="p-1">Note</th></tr></thead>
            <tbody>{attendanceRows.map((row, index) => {
              const student = studentById.get(row.student_id);
              return <tr key={`${row.student_id}-${row.date}-${index}`} className="border-b border-slate-200">
                <td className="whitespace-nowrap p-1">{printDate(row.date)}</td>
                <td className="p-1">{profileById.get(student?.profile_id || "")?.full_name || "Name unavailable"}</td>
                <td className="p-1">{student?.admission_no || "—"}</td>
                <td className="p-1">{classById.get(student?.class_id || "") || "—"}</td>
                <td className="p-1 capitalize">{row.status}</td>
                <td className="p-1">{row.note || "—"}</td>
              </tr>;
            })}</tbody>
          </table>
          {!attendanceRows.length && <p className="py-2 text-xs text-slate-500">No attendance records.</p>}
        </section>
      </main>
    </>
  );
}
