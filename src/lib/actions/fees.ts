"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeStoredFile } from "@/lib/storage";

/** Generate fee ledger rows for a student for a range of months. */
export async function generateFeeMonths(formData: FormData) {
  const profile = await requireAdmin("manage_fees");
  if (profile.role === "teacher") redirect("/admin?denied=1");
  const admin = createAdminClient();
  const studentId = String(formData.get("student_id"));
  const start = String(formData.get("start_month")); // YYYY-MM
  const count = Number(formData.get("months") || 12);
  const { data: student } = await admin.from("students").select("monthly_fee").eq("id", studentId).single();
  if (!student) redirect("/admin/fees?error=1");

  const [y, m] = start.split("-").map(Number);
  const rows = [];
  const d = new Date(y, m - 1, 1);
  for (let i = 0; i < count; i++) {
    rows.push({
      student_id: studentId,
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      amount: student!.monthly_fee,
      status: "pending",
    });
    d.setMonth(d.getMonth() + 1);
  }
  await admin.from("fee_records").upsert(rows, { onConflict: "student_id,month", ignoreDuplicates: true });
  revalidatePath("/admin/fees");
  redirect("/admin/fees?generated=1");
}

/** Create or reset one student's selected month as pending. */
export async function markFeePending(formData: FormData) {
  const profile = await requireAdmin("manage_fees");
  if (profile.role === "teacher") redirect("/admin?denied=1");
  const admin = createAdminClient();
  const studentId = String(formData.get("student_id") || "");
  const month = String(formData.get("month") || "");
  const { data: student } = await admin.from("students").select("monthly_fee").eq("id", studentId).single();
  if (!studentId || !month || !student) redirect("/admin/fees?error=1");
  await admin.from("fee_records").upsert({
    student_id: studentId,
    month,
    amount: student.monthly_fee,
    status: "pending",
    paid_at: null,
  }, { onConflict: "student_id,month" });
  revalidatePath("/admin/fees");
  revalidatePath("/portal/fees");
  revalidatePath("/portal");
  redirect("/admin/fees?pending=1");
}

/** Mark a fee month as paid directly (cash payment at office). */
export async function recordManualPayment(formData: FormData) {
  const me = await requireAdmin("verify_payments");
  if (me.role === "teacher") redirect("/admin/payment-proofs?denied=1");
  const admin = createAdminClient();
  const studentId = String(formData.get("student_id"));
  const month = String(formData.get("month"));
  const amount = Number(formData.get("amount"));

  const { data: receipt } = await admin.from("receipts").insert({
    receipt_no: await nextReceiptNo(admin),
    student_id: studentId, month, amount,
    method: String(formData.get("method") || "cash"),
    reference_no: String(formData.get("reference_no") || "") || null,
    issued_by: me.id,
  }).select().single();

  await admin.from("fee_records").upsert({
    student_id: studentId, month, amount, status: "paid",
    paid_at: new Date().toISOString(),
  }, { onConflict: "student_id,month" });

  revalidatePath("/admin/fees");
  redirect(`/admin/fees?paid=1&receipt=${receipt?.receipt_no ?? ""}`);
}

/** Approve a submitted payment proof → fee month becomes Paid → receipt generated. */
export async function approvePaymentProof(formData: FormData) {
  const me = await requireAdmin("verify_payments");
  const admin = createAdminClient();
  const proofId = String(formData.get("proof_id"));

  const { data: proof } = await admin.from("payment_proofs").select("*").eq("id", proofId).single();
  if (!proof || proof.status !== "pending") redirect("/admin/payment-proofs?error=1");

  const { data: receipt } = await admin.from("receipts").insert({
    receipt_no: await nextReceiptNo(admin),
    student_id: proof.student_id, month: proof.month, amount: proof.amount,
    method: proof.method, reference_no: proof.reference_no, issued_by: me.id,
  }).select().single();

  await admin.from("fee_records").upsert({
    student_id: proof.student_id, month: proof.month, amount: proof.amount,
    status: "paid", paid_at: new Date().toISOString(),
  }, { onConflict: "student_id,month" });

  await admin.from("payment_proofs").update({
    status: "approved", receipt_id: receipt?.id ?? null,
    reviewed_by: me.id, reviewed_at: new Date().toISOString(),
  }).eq("id", proofId);

  revalidatePath("/admin/payment-proofs");
  redirect(`/admin/payment-proofs?approved=1&receipt=${receipt?.receipt_no ?? ""}`);
}

export async function rejectPaymentProof(formData: FormData) {
  const me = await requireAdmin("verify_payments");
  const admin = createAdminClient();
  await admin.from("payment_proofs").update({
    status: "rejected",
    rejection_reason: String(formData.get("reason") || ""),
    reviewed_by: me.id, reviewed_at: new Date().toISOString(),
  }).eq("id", String(formData.get("proof_id")));
  revalidatePath("/admin/payment-proofs");
  redirect("/admin/payment-proofs?rejected=1");
}

export async function deletePaymentProof(formData: FormData) {
  await requireAdmin("verify_payments");
  const admin = createAdminClient();
  const proofId = String(formData.get("proof_id") || "");
  const { data: proof } = await admin.from("payment_proofs").select("*").eq("id", proofId).maybeSingle();
  if (!proof) return;
  if (proof.proof_url && !(await removeStoredFile(proof.proof_url))) redirect("/admin/payment-proofs?error=delete");
  if (proof.receipt_id) await admin.from("receipts").delete().eq("id", proof.receipt_id);
  const { error } = await admin.from("payment_proofs").delete().eq("id", proofId);
  if (error) redirect("/admin/payment-proofs?error=delete");
  const { count } = await admin.from("receipts").select("id", { count: "exact", head: true })
    .eq("student_id", proof.student_id).eq("month", proof.month);
  if (!count) await admin.from("fee_records").update({ status: "pending", paid_at: null })
    .eq("student_id", proof.student_id).eq("month", proof.month);
  revalidatePath("/admin/payment-proofs");
  revalidatePath("/admin/fees");
  revalidatePath("/portal/fees");
  redirect("/admin/payment-proofs?deleted=1");
}

export async function deleteFeeHistory(formData: FormData) {
  await requireAdmin("manage_fees");
  const admin = createAdminClient();
  const recordId = String(formData.get("record_id") || "");
  const { data: record } = await admin.from("fee_records").select("student_id, month").eq("id", recordId).maybeSingle();
  if (!record) return;
  const [{ data: proofs }, { data: receipts }] = await Promise.all([
    admin.from("payment_proofs").select("id, proof_url").eq("student_id", record.student_id).eq("month", record.month),
    admin.from("receipts").select("id").eq("student_id", record.student_id).eq("month", record.month),
  ]);
  for (const proof of proofs || []) {
    if (proof.proof_url && !(await removeStoredFile(proof.proof_url))) redirect("/admin/fees?error=delete");
  }
  if (proofs?.length) {
    const { error } = await admin.from("payment_proofs").delete().in("id", proofs.map((proof) => proof.id));
    if (error) redirect("/admin/fees?error=delete");
  }
  if (receipts?.length) {
    const { error } = await admin.from("receipts").delete().in("id", receipts.map((receipt) => receipt.id));
    if (error) redirect("/admin/fees?error=delete");
  }
  const { error } = await admin.from("fee_records").delete().eq("id", recordId);
  if (error) redirect("/admin/fees?error=delete");
  revalidatePath("/admin/fees");
  revalidatePath("/admin/payment-proofs");
  revalidatePath("/portal/fees");
  revalidatePath("/portal");
  redirect("/admin/fees?deleted=1");
}

async function nextReceiptNo(admin: any): Promise<string> {
  const { count } = await admin.from("receipts").select("*", { count: "exact", head: true });
  return `RCP-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

/** Salary: add / mark paid */
export async function addSalaryRecord(formData: FormData) {
  await requireAdmin("manage_salaries");
  const admin = createAdminClient();
  const teacherId = String(formData.get("teacher_id") || "");
  const month = String(formData.get("month") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!teacherId || !month || !amount || amount < 0) redirect("/admin/salaries?error=invalid");
  const { error } = await admin.from("salary_records").upsert({
    teacher_id: teacherId,
    month,
    amount,
    status: "pending",
  }, { onConflict: "teacher_id,month" });
  if (error) redirect(`/admin/salaries?error=${error.code === "23505" ? "duplicate" : "invalid"}`);
  revalidatePath("/admin/salaries");
  redirect("/admin/salaries?added=1");
}

export async function paySalary(formData: FormData) {
  const me = await requireAdmin("manage_salaries");
  const admin = createAdminClient();
  await admin.from("salary_records").update({
    status: "paid", paid_at: new Date().toISOString(), approved_by: me.id,
  }).eq("id", String(formData.get("record_id")));
  revalidatePath("/admin/salaries");
  redirect("/admin/salaries?paid=1");
}

export async function deleteSalaryRecord(formData: FormData) {
  await requireAdmin("manage_salaries");
  const admin = createAdminClient();
  const { error } = await admin.from("salary_records").delete().eq("id", String(formData.get("record_id") || ""));
  if (error) redirect("/admin/salaries?error=delete");
  revalidatePath("/admin/salaries");
  redirect("/admin/salaries?deleted=1");
}
