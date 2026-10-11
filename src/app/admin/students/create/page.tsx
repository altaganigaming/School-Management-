import { redirect } from "next/navigation";
import { PageHeader, Field } from "@/components/ui";
import { createAccount } from "@/lib/actions/accounts";
import { requireAdmin } from "@/lib/auth";
import { hasPerm } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CreateStudentAccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const profile = await requireAdmin();
  const canCreate = hasPerm(profile.role, profile.permissions, "create_student_accounts")
    || hasPerm(profile.role, profile.permissions, "manage_students");
  if (!canCreate) redirect("/admin?denied=1");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: classes } = await supabase.from("classes").select("id, name, section").order("name").order("section");

  return (
    <>
      <PageHeader title="Create Student Account" subtitle="Create a student login and assign class details." />
      {sp.created && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Student account @{sp.created} created.</div>}
      {sp.error === "exists" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Username, admission number, or roll number already exists.</div>}
      {sp.error === "missing" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Complete all required student account details.</div>}
      {sp.error === "save" && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Account could not be saved. Check class, admission number, and roll number.</div>}

      <form action={createAccount} className="card grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="role" value="student" />
        <Field label="Full Name"><input name="full_name" className="input" autoComplete="name" required /></Field>
        <Field label="Username"><input name="username" className="input" autoComplete="username" required /></Field>
        <Field label="Password"><input name="password" type="password" className="input" autoComplete="new-password" minLength={6} required /></Field>
        <Field label="Admission Number"><input name="admission_no" className="input" required /></Field>
        <Field label="Class / Section"><select name="class_id" className="input" defaultValue="" required>
          <option value="" disabled>Select class</option>
          {(classes || []).map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}
        </select></Field>
        <Field label="Roll Number"><input name="roll_no" type="number" min={1} className="input" required /></Field>
        <Field label="Date of Birth"><input name="dob" type="date" className="input" /></Field>
        <Field label="Parent Name"><input name="parent_name" className="input" /></Field>
        <Field label="Parent Phone"><input name="parent_phone" type="tel" className="input" /></Field>
        <Field label="Monthly Fee"><input name="monthly_fee" type="number" min={0} step="0.01" defaultValue={0} className="input" /></Field>
        <Field label="Admission Date"><input name="admission_date" type="date" className="input" /></Field>
        <Field label="Address"><input name="address" className="input" /></Field>
        <div className="sm:col-span-2 lg:col-span-3"><button className="btn-primary">Create Student Account</button></div>
      </form>
    </>
  );
}