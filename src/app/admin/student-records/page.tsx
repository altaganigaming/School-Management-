import { DownloadPdfButton } from "@/components/download-pdf-button";
import { EmptyState, PageHeader } from "@/components/ui";
import { getSettings, requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SECTIONS = [
  ["admission", "Admission & Profile"], ["fees", "Fees, Receipts & Proofs"],
  ["attendance", "Attendance"], ["leave", "Leave Requests"],
  ["exams", "Exams & Results"], ["academics", "Class Homework & Materials"],
] as const;

function selectedList(value: string | string[] | undefined) {
  return value === undefined ? SECTIONS.map(([key]) => key) : Array.isArray(value) ? value : [value];
}

function dateLabel(value: string | null | undefined) {
  return value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN") : "—";
}

export default async function IndividualStudentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const studentId = Array.isArray(params.student_id) ? params.student_id[0] : params.student_id;
  const requestedSections = new Set(selectedList(params.section).filter((section) => SECTIONS.some(([key]) => key === section)));
  const admin = createAdminClient();
  const [{ data: students }, settings] = await Promise.all([
    admin.from("students").select("id, profile_id, admission_no, class_id, roll_no, admission_date, profiles(full_name)").order("admission_no"),
    getSettings(),
  ]);
  const student = (students || []).find((row) => row.id === studentId);
  const [{ data: detail }, { data: profile }, { data: classInfo }] = student ? await Promise.all([
    admin.from("students").select("dob, parent_name, parent_phone, address, monthly_fee, admission_date").eq("id", student.id).maybeSingle(),
    student.profile_id ? admin.from("profiles").select("full_name, username, phone, is_active").eq("id", student.profile_id).maybeSingle() : Promise.resolve({ data: null }),
    student.class_id ? admin.from("classes").select("name, section").eq("id", student.class_id).maybeSingle() : Promise.resolve({ data: null }),
  ]) : [{ data: null }, { data: null }, { data: null }];

  const [fees, receipts, proofs, attendance, leaves, results, homework, materials] = student ? await Promise.all([
    requestedSections.has("fees") ? admin.from("fee_records").select("month, amount, status, paid_at").eq("student_id", student.id).order("month", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("fees") ? admin.from("receipts").select("receipt_no, month, amount, method, issued_at").eq("student_id", student.id).order("issued_at", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("fees") ? admin.from("payment_proofs").select("month, amount, method, status, created_at, rejection_reason").eq("student_id", student.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("attendance") ? admin.from("attendance").select("date, status, note").eq("student_id", student.id).order("date", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("leave") && student.profile_id ? admin.from("leave_requests").select("type, from_date, to_date, reason, status, review_note, created_at").eq("profile_id", student.profile_id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("exams") ? admin.from("exam_results").select("marks, max_marks, grade, exams(name, start_date, end_date), subjects(name)").eq("student_id", student.id).order("exam_id") : Promise.resolve({ data: [] }),
    requestedSections.has("academics") && student.class_id ? admin.from("homework").select("title, description, due_date, created_at, subjects(name)").eq("class_id", student.class_id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    requestedSections.has("academics") && student.class_id ? admin.from("study_materials").select("title, description, created_at, subjects(name)").or(`class_id.is.null,class_id.eq.${student.class_id}`).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]) : [[], [], [], [], [], [], [], []];
  const feeRows = Array.isArray(fees) ? [] : fees.data || [];
  const attendanceRows = Array.isArray(attendance) ? [] : attendance.data || [];
  const paidTotal = feeRows.filter((row) => row.status === "paid").reduce((sum, row) => sum + Number(row.amount), 0);
  const pendingTotal = feeRows.filter((row) => row.status === "pending").reduce((sum, row) => sum + Number(row.amount), 0);
  const presentDays = attendanceRows.filter((row) => row.status === "present").length;
  const absentDays = attendanceRows.filter((row) => row.status === "absent").length;
  const otherDays = attendanceRows.length - presentDays - absentDays;

  return (
    <>
      <div className="print-hidden">
        <PageHeader title="Individual Student Records" subtitle="Choose one student and the records to include in a printable report." />
        <form method="GET" className="card grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="label">Student</span>
            <select name="student_id" className="input" required defaultValue={studentId || ""}>
              <option value="" disabled>Select a student</option>
              {(students || []).map((row) => {
                const studentProfile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                return <option key={row.id} value={row.id}>{row.admission_no} · {studentProfile?.full_name || "Name unavailable"}</option>;
              })}
            </select>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="label">Include records</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SECTIONS.map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                <input type="checkbox" name="section" value={key} defaultChecked={requestedSections.has(key)} className="h-4 w-4" />{label}
              </label>)}
            </div>
          </fieldset>
          <button className="btn-primary sm:col-span-2">Generate Student Record</button>
        </form>
      </div>

      {student && detail ? <main className="print-document mx-auto mt-6 max-w-5xl space-y-5 text-slate-900">
        <div className="print-hidden"><DownloadPdfButton /></div>
        <header className="border-b border-slate-300 pb-4">
          <h1 className="text-2xl font-bold">{settings.school_name || "Well Future Academy"}</h1>
          <h2 className="mt-2 text-lg font-semibold">Student Record · {profile?.full_name || "Name unavailable"}</h2>
          <p className="mt-1 text-sm text-slate-600">Admission No. {student.admission_no} · {classInfo ? `${classInfo.name} - ${classInfo.section}` : "Class —"} · Roll No. {student.roll_no ?? "—"}</p>
          <p className="mt-1 text-xs text-slate-500">Generated {new Date().toLocaleString("en-IN")}</p>
        </header>

        {requestedSections.has("admission") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Admission & Profile</h3>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[["Full Name", profile?.full_name], ["Username", profile?.username ? `@${profile.username}` : "—"], ["Phone", profile?.phone], ["Date of Birth", dateLabel(detail.dob)], ["Parent / Guardian", detail.parent_name], ["Parent Phone", detail.parent_phone], ["Address", detail.address], ["Admission Date", dateLabel(detail.admission_date || student.admission_date)], ["Monthly Fee", formatCurrency(detail.monthly_fee)]]
              .map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt><dd>{value || "—"}</dd></div>)}
          </dl>
        </section>}

        {requestedSections.has("fees") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Fee Ledger</h3>
          <p className="mb-2 text-xs">Paid total: {formatCurrency(paidTotal)} · Pending total: {formatCurrency(pendingTotal)} · {feeRows.length} fee month(s)</p>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Month</th><th className="p-1">Amount</th><th className="p-1">Status</th><th className="p-1">Paid On</th></tr></thead>
            <tbody>{(fees.data || []).map((row, index) => <tr key={`${row.month}-${index}`} className="border-b"><td className="p-1">{monthLabel(row.month)}</td><td className="p-1">{formatCurrency(row.amount)}</td><td className="p-1 capitalize">{row.status}</td><td className="p-1">{dateLabel(row.paid_at)}</td></tr>)}</tbody>
          </table>
          {!fees.data?.length && <p className="text-xs text-slate-500">No fee ledger entries.</p>}
          <h4 className="mb-1 mt-4 font-semibold">Issued Receipts</h4>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Receipt No.</th><th className="p-1">Month</th><th className="p-1">Amount</th><th className="p-1">Method</th><th className="p-1">Issued</th></tr></thead>
            <tbody>{(receipts.data || []).map((row) => <tr key={row.receipt_no} className="border-b"><td className="p-1">{row.receipt_no}</td><td className="p-1">{monthLabel(row.month)}</td><td className="p-1">{formatCurrency(row.amount)}</td><td className="p-1 capitalize">{row.method || "—"}</td><td className="p-1">{dateLabel(row.issued_at)}</td></tr>)}</tbody>
          </table>
          <h4 className="mb-1 mt-4 font-semibold">Payment Proof Submissions</h4>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Submitted</th><th className="p-1">Month</th><th className="p-1">Amount</th><th className="p-1">Method</th><th className="p-1">Status</th></tr></thead>
            <tbody>{(proofs.data || []).map((row, index) => <tr key={`${row.month}-${row.created_at}-${index}`} className="border-b"><td className="p-1">{dateLabel(row.created_at)}</td><td className="p-1">{monthLabel(row.month)}</td><td className="p-1">{formatCurrency(row.amount)}</td><td className="p-1 capitalize">{row.method}</td><td className="p-1 capitalize">{row.status}{row.rejection_reason ? ` · ${row.rejection_reason}` : ""}</td></tr>)}</tbody>
          </table>
        </section>}

        {requestedSections.has("attendance") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Attendance</h3>
          <p className="mb-2 text-xs">Present: {presentDays} day(s) · Absent: {absentDays} day(s) · Other: {otherDays} day(s) · Total recorded: {attendanceRows.length} day(s)</p>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Date</th><th className="p-1">Status</th><th className="p-1">Note</th></tr></thead>
            <tbody>{(attendance.data || []).map((row, index) => <tr key={`${row.date}-${index}`} className="border-b"><td className="p-1">{dateLabel(row.date)}</td><td className="p-1 capitalize">{row.status}</td><td className="p-1">{row.note || "—"}</td></tr>)}</tbody>
          </table>
          {!attendance.data?.length && <p className="text-xs text-slate-500">No attendance entries.</p>}
        </section>}

        {requestedSections.has("leave") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Leave Requests</h3>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Dates</th><th className="p-1">Type</th><th className="p-1">Reason</th><th className="p-1">Status / Review</th></tr></thead>
            <tbody>{(leaves.data || []).map((row, index) => <tr key={`${row.created_at}-${index}`} className="border-b align-top"><td className="p-1">{dateLabel(row.from_date)} – {dateLabel(row.to_date)}</td><td className="p-1 capitalize">{row.type}</td><td className="p-1">{row.reason || "—"}</td><td className="p-1 capitalize">{row.status}{row.review_note ? ` · ${row.review_note}` : ""}</td></tr>)}</tbody>
          </table>
          {!leaves.data?.length && <p className="text-xs text-slate-500">No leave requests.</p>}
        </section>}

        {requestedSections.has("exams") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Exam Results</h3>
          <table className="w-full border-collapse text-xs"><thead><tr className="border-b text-left"><th className="p-1">Exam</th><th className="p-1">Subject</th><th className="p-1">Marks</th><th className="p-1">Grade</th></tr></thead>
            <tbody>{(results.data || []).map((row, index) => <tr key={`${row.exam_id}-${index}`} className="border-b"><td className="p-1">{Array.isArray(row.exams) ? row.exams[0]?.name : row.exams?.name}</td><td className="p-1">{Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name}</td><td className="p-1">{row.marks} / {row.max_marks}</td><td className="p-1">{row.grade || "—"}</td></tr>)}</tbody>
          </table>
          {!results.data?.length && <p className="text-xs text-slate-500">No exam results.</p>}
        </section>}

        {requestedSections.has("academics") && <section className="break-inside-avoid">
          <h3 className="mb-2 border-b border-slate-300 pb-1 font-bold">Class Homework & Materials</h3>
          <h4 className="mb-1 font-semibold">Homework</h4>
          <ul className="list-disc space-y-1 pl-5 text-xs">{(homework.data || []).map((row, index) => <li key={`${row.title}-${index}`}><b>{row.title}</b> · {Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name || "General"} · due {dateLabel(row.due_date)}{row.description ? ` · ${row.description}` : ""}</li>)}</ul>
          {!homework.data?.length && <p className="text-xs text-slate-500">No class homework entries.</p>}
          <h4 className="mb-1 mt-3 font-semibold">Study Materials</h4>
          <ul className="list-disc space-y-1 pl-5 text-xs">{(materials.data || []).map((row, index) => <li key={`${row.title}-${index}`}><b>{row.title}</b> · {Array.isArray(row.subjects) ? row.subjects[0]?.name : row.subjects?.name || "General"}{row.description ? ` · ${row.description}` : ""}</li>)}</ul>
          {!materials.data?.length && <p className="text-xs text-slate-500">No class study materials.</p>}
        </section>}
      </main> : studentId ? <div className="card mt-6"><EmptyState message="That student record could not be found." /></div> : null}
    </>
  );
}