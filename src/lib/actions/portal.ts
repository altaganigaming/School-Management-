"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireLogin, requireStudent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
  revalidatePath("/admin");
  redirect(`${destination}?submitted=1`);
}

export async function reviewLeaveRequest(formData: FormData) {
  const reviewer = await requireAdmin("manage_leave");
  if (reviewer.role === "teacher") redirect("/admin");
  const status = String(formData.get("status") || "");
  const requestId = String(formData.get("id") || "");
  const reviewNote = String(formData.get("review_note") || "").trim();
  if ((status !== "approved" && status !== "rejected") || !requestId) return;
  if (status === "rejected" && !reviewNote) redirect("/admin?leave_error=note");

  const admin = createAdminClient();
  const { error } = await admin.from("leave_requests").update({ status, review_note: reviewNote || null, reviewed_by: reviewer.id })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) return;
  revalidatePath("/admin");
  revalidatePath("/admin/leave");
}

export async function deleteLeaveRequest(formData: FormData) {
  const actor = await requireLogin();
  const requestId = String(formData.get("id") || "");
  if (!requestId) return;
  const admin = createAdminClient();
  const { data: request } = await admin.from("leave_requests").select("id, profile_id, status").eq("id", requestId).maybeSingle();
  if (!request) return;

  if (actor.role === "super_admin") {
    await admin.from("leave_requests").delete().eq("id", requestId);
  } else if ((actor.role === "teacher" || actor.role === "student") && request.profile_id === actor.id && request.status === "pending") {
    await admin.from("leave_requests").delete().eq("id", requestId).eq("profile_id", actor.id).eq("status", "pending");
  } else {
    await requireAdmin("manage_leave");
    await admin.from("leave_requests").delete().eq("id", requestId);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/leave");
  revalidatePath("/portal/attendance");
}
