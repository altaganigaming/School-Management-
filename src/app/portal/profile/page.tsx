import { createClient } from "@/lib/supabase/server";
import { requireLogin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { PhotoViewer } from "@/components/photo-viewer";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireLogin();
  const supabase = await createClient();
  if (profile.role !== "student") {
    const { data: teacher } = profile.role === "teacher"
      ? await supabase.from("teachers").select("employee_id, qualification, joining_date, assigned_subjects, subject_id").eq("profile_id", profile.id).maybeSingle()
      : { data: null };
    const subjectIds = Array.isArray(teacher?.assigned_subjects) && teacher.assigned_subjects.length
      ? teacher.assigned_subjects.map(String)
      : teacher?.subject_id ? [teacher.subject_id] : [];
    const { data: subjects } = subjectIds.length
      ? await supabase.from("subjects").select("name").in("id", subjectIds)
      : { data: [] };
    const rows: [string, string][] = [
      ["Full Name", profile.full_name], ["Username", `@${profile.username}`],
      ["Role", profile.role === "teacher" ? "Teacher" : "Staff"], ["Phone", profile.phone || "—"],
      ...(profile.role === "teacher" ? [["Employee ID", teacher?.employee_id || "—"], ["Qualification", teacher?.qualification || "—"], ["Joining Date", teacher?.joining_date || "—"], ["Subjects", subjects?.map((subject) => subject.name).join(", ") || "—"]] as [string, string][] : []),
    ];
    return (<>
      <PageHeader title="My Profile" subtitle="Your official school account details." />
      <div className="card max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          {profile.avatar_url
            ? <PhotoViewer src={profile.avatar_url} className="h-20 w-20 rounded-full ring-4 ring-primary-100" imageClassName="h-full w-full rounded-full object-cover" alt={`${profile.full_name} profile photo`} />
            : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">{(profile.full_name || "S")[0]}</div>}
          <div><div className="text-xl font-bold text-slate-900">{profile.full_name}</div><div className="text-sm capitalize text-slate-500">{profile.role}</div></div>
        </div>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map(([key, value]) => <div key={key}><dt className="label">{key}</dt><dd className="text-sm font-medium text-slate-800">{value}</dd></div>)}
        </dl>
      </div>
    </>);
  }
  const { data: s } = await supabase.from("students")
    .select("*, classes(name, section)").eq("profile_id", profile.id).single();

  const rows: [string, any][] = [
    ["Full Name", profile.full_name], ["Username", "@" + profile.username],
    ["Admission No", s?.admission_no], ["Class", s?.classes ? `${s.classes.name} - ${s.classes.section}` : "—"],
    ["Roll No", s?.roll_no ?? "—"], ["Date of Birth", s?.dob ?? "—"],
    ["Parent Name", s?.parent_name ?? "—"], ["Parent Phone", s?.parent_phone ?? "—"],
    ["Address", s?.address ?? "—"], ["Admission Date", s?.admission_date ?? "—"],
    ["Monthly Fee", formatCurrency(s?.monthly_fee)],
  ];
  return (<>
    <PageHeader title="My Profile" subtitle="Official records — contact the school office to request changes." />
    <div className="card max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        {profile.avatar_url
          ? <PhotoViewer src={profile.avatar_url} className="h-20 w-20 rounded-full ring-4 ring-primary-100" imageClassName="h-full w-full rounded-full object-cover" alt={`${profile.full_name} profile photo`} />
          : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">{(profile.full_name || "S")[0]}</div>}
        <div><div className="text-xl font-bold text-slate-900">{profile.full_name}</div>
          <div className="text-sm text-slate-500">Student · {s?.admission_no}</div></div>
      </div>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="label">{k}</dt><dd className="text-sm font-medium text-slate-800">{v}</dd></div>))}
      </dl>
    </div></>);
}
