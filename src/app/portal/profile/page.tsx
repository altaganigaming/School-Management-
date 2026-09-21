import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireStudent();
  const supabase = await createClient();
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
          ? <img src={profile.avatar_url} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-100" alt="avatar" />
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
