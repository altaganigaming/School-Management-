"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function submitPaymentProof(formData: FormData) {
  const profile = await requireStudent();
  const supabase = await createClient();

  let proofUrl: string | null = null;
  const file = formData.get("proof") as File | null;
  if (file && file.size > 0) {
    const path = `${profile.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("proofs").upload(path, file);
    if (error) redirect("/portal/fees?error=upload");
    proofUrl = supabase.storage.from("proofs").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("payment_proofs").insert({
    student_id: String(formData.get("student_id")),
    month: String(formData.get("month")),
    amount: Number(formData.get("amount")),
    method: String(formData.get("method")),
    reference_no: String(formData.get("reference_no") || "") || null,
    note: String(formData.get("note") || "") || null,
    proof_url: proofUrl,
    submitted_by: profile.id,
  });
  if (error) redirect("/portal/fees?error=1");
  revalidatePath("/portal/fees");
  redirect("/portal/fees?submitted=1");
}

export async function submitLeave(formData: FormData) {
  const profile = await requireStudent();
  const supabase = await createClient();
  await supabase.from("leave_requests").insert({
    profile_id: profile.id,
    type: String(formData.get("type") || "casual"),
    from_date: String(formData.get("from_date")),
    to_date: String(formData.get("to_date")),
    reason: String(formData.get("reason")),
  });
  revalidatePath("/portal/attendance");
  redirect("/portal/attendance?leave=1");
}
