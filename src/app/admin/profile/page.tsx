import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { PhotoViewer } from "@/components/photo-viewer";
import { updateTeacherProfile } from "@/lib/actions/profile";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherProfilePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireAdmin();
  if (profile.role !== "teacher") redirect("/admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: teacher } = await supabase.from("teachers")
    .select("employee_id, qualification, subject_id, assigned_classes, assigned_subjects")
    .eq("profile_id", profile.id).maybeSingle();

  const classIds = Array.isArray(teacher?.assigned_classes) ? teacher.assigned_classes.map(String) : [];
  const subjectIds = Array.isArray(teacher?.assigned_subjects) && teacher.assigned_subjects.length
    ? teacher.assigned_subjects.map(String)
    : teacher?.subject_id ? [teacher.subject_id] : [];
  const [{ data: classes }, { data: subjects }] = await Promise.all([
    classIds.length ? supabase.from("classes").select("name, section").in("id", classIds) : Promise.resolve({ data: [] }),
    subjectIds.length ? supabase.from("subjects").select("name").in("id", subjectIds) : Promise.resolve({ data: [] }),
  ]);
  const editable = new Set(profile.self_editable_fields || []);

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update your photo and personal details enabled by the Principal." />
      {sp.updated && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Profile updated.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "image" ? "Choose an image under 5 MB." : sp.error === "storage" ? "Photo could not be replaced safely. Your existing photo was kept." : sp.error === "invalid" ? "Enter a valid full name." : "Profile could not be updated."}</div>}

      <form action={updateTeacherProfile} encType="multipart/form-data" className="card max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          {profile.avatar_url
            ? <PhotoViewer src={profile.avatar_url} alt={`${profile.full_name} profile photo`} className="h-20 w-20 rounded-full ring-4 ring-primary-100" imageClassName="h-full w-full rounded-full object-cover" />
            : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">{(profile.full_name || "T")[0]}</div>}
          <div><h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2><p className="text-sm text-slate-500">Teacher · {teacher?.employee_id || "Employee ID unavailable"}</p></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Full Name</span>
            {editable.has("full_name")
              ? <input name="full_name" className="input" defaultValue={profile.full_name} required />
              : <input className="input" value={profile.full_name} readOnly />}
          </label>
          <label className="block"><span className="label">Phone</span>
            {editable.has("phone")
              ? <input name="phone" type="tel" className="input" defaultValue={profile.phone || ""} />
              : <input className="input" value={profile.phone || "Not provided"} readOnly />}
          </label>
          <div className="block sm:col-span-2">
            <span className="label">Profile Photo</span>
            <input name="avatar" type="file" accept="image/*" className="input" />
            <p className="mt-1 text-xs text-slate-400">Your photo appears with your name in the public Faculty section. Maximum 5 MB.</p>
            {profile.avatar_url && <label className="mt-2 flex items-center gap-2 text-xs text-red-600"><input type="checkbox" name="remove_avatar" value="true" className="h-4 w-4" />Remove current photo</label>}
          </div>
          <div><span className="label">Qualification</span><p className="text-sm text-slate-800">{teacher?.qualification || "—"}</p></div>
          <div><span className="label">Assigned Classes</span><p className="text-sm text-slate-800">{classes?.length ? classes.map((item) => `${item.name} - ${item.section}`).join(", ") : "—"}</p></div>
          <div className="sm:col-span-2"><span className="label">Assigned Subjects</span><p className="text-sm text-slate-800">{subjects?.length ? subjects.map((item) => item.name).join(", ") : "—"}</p></div>
        </div>
        <button className="btn-primary mt-6">Save Profile</button>
      </form>
    </>
  );
}