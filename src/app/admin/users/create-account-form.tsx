"use client";

import { useState } from "react";
import { Field } from "@/components/ui";
import { createAccount } from "@/lib/actions/accounts";

type AccountRole = "teacher" | "staff" | "student";
type Option = { id: string; name: string; section?: string };

export default function CreateAccountForm({ classes, subjects }: { classes: Option[]; subjects: Option[] }) {
  const [role, setRole] = useState<AccountRole>("teacher");

  return (
    <form action={createAccount} className="card mb-8">
      <h2 className="card-title">➕ Create Account</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Role"><select name="role" className="input" value={role} onChange={(event) => setRole(event.target.value as AccountRole)} required>
          <option value="teacher">Teacher</option><option value="staff">Staff</option><option value="student">Student</option>
        </select></Field>
        <Field label="Username"><input name="username" className="input" autoComplete="username" required /></Field>
        <Field label="Password"><input name="password" type="password" className="input" autoComplete="new-password" required minLength={6} /></Field>
        <Field label="Full Name"><input name="full_name" className="input" autoComplete="name" required /></Field>

        {role === "student" && <>
          <Field label="Admission No."><input name="admission_no" className="input" placeholder="e.g. ADM-2026-001" required /></Field>
          <Field label="Class / Section"><select name="class_id" className="input" defaultValue="" required>
            <option value="" disabled>Select class</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.section}</option>)}
          </select></Field>
          <Field label="Roll No."><input name="roll_no" type="number" min={1} className="input" required /></Field>
          <Field label="Date of Birth"><input name="dob" type="date" className="input" /></Field>
          <Field label="Parent Name"><input name="parent_name" className="input" /></Field>
          <Field label="Parent Phone"><input name="parent_phone" type="tel" className="input" /></Field>
          <Field label="Monthly Fee"><input name="monthly_fee" type="number" min={0} step="0.01" defaultValue={0} className="input" /></Field>
          <Field label="Admission Date"><input name="admission_date" type="date" className="input" /></Field>
          <Field label="Phone"><input name="phone" type="tel" className="input" /></Field>
          <Field label="Address"><input name="address" className="input" /></Field>
        </>}

        {role === "teacher" && <>
          <Field label="Employee ID"><input name="employee_id" className="input" placeholder="e.g. EMP-001" required /></Field>
          <Field label="Qualification"><input name="qualification" className="input" /></Field>
          <Field label="Joining Date"><input name="joining_date" type="date" className="input" /></Field>
          <Field label="Phone"><input name="phone" type="tel" className="input" /></Field>
          <Field label="Address"><input name="address" className="input" /></Field>
          <Field label="Assigned Classes"><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="assigned_classes" value="" />
            {classes.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_classes" value={item.id} className="h-4 w-4" />{item.name} - {item.section}</label>)}
          </div></Field>
          <Field label="Assigned Subjects"><div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <input type="hidden" name="assigned_subjects" value="" />
            {subjects.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="assigned_subjects" value={item.id} className="h-4 w-4" />{item.name}</label>)}
          </div></Field>
        </>}

        {role === "staff" && <>
          <Field label="Phone"><input name="phone" type="tel" className="input" /></Field>
          <Field label="Address"><input name="address" className="input" /></Field>
        </>}
      </div>
      <button className="btn-primary mt-4">Create {role === "student" ? "Student" : role === "teacher" ? "Teacher" : "Staff"} Account</button>
    </form>
  );
}