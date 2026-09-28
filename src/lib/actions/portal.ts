"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLogin, requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function submitPaymentProof(formData: FormData) {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { error } = await supabase.from("payment_proofs").insert({
    student_id: String(formData.get("student_id")),
    month: String(formData.get("month")),
    amount: Number(formData.get("amount")),
    method: String(formData.get("method")),
    reference_no: String(formData.get("reference_no") || "") || null,
    note: String(formData.get("note") || "") || null,
    submitted_by: profile.id,
  });
  if (error) redirect("/portal/fees?error=1");
  revalidatePath("/portal/fees");
  redirect("/portal/fees?submitted=1");
}

export async function submitLeave(formData: FormData) {
  const profile = await requireLogin();
  if (profile.role !== "teacher" && profile.role !== "student") redirect("/admin");
  const fromDate = String(formData.get("from_date") || "");
  const toDate = String(formData.get("to_date") || "");
  const reason = String(formData.get("reason") || "").trim();
  const type = String(formData.get("type") || "casual");
  if (!isValidDate(fromDate) || !isValidDate(toDate) || fromDate > toDate || !reason
    || !["casual", "sick", "other"].includes(type)) redirect(profile.role === "teacher" ? "/admin/leave?error=invalid" : "/portal/attendance?leave=error");
  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").insert({
    profile_id: profile.id,
    type,
    from_date: fromDate,
    to_date: toDate,
    reason,
  });
  if (error) redirect(profile.role === "teacher" ? "/admin/leave?error=save" : "/portal/attendance?leave=error");
  const destination = profile.role === "teacher" ? "/admin/leave" : "/portal/attendance";
  revalidatePath(destination);
  redirect(`${destination}?submitted=1`);
}
