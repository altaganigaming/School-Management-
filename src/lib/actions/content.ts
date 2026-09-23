"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Table = "notices" | "documents" | "gallery" | "events" | "achievements";
const PERM: Record<Table, string> = {
  notices: "manage_notices",
  documents: "manage_documents",
  gallery: "manage_gallery",
  events: "manage_events",
  achievements: "manage_achievements",
};

export async function submitAdmission(formData: FormData) {
  const supabase = await createClient();
  const value = (key: string) => String(formData.get(key) || "").trim();
  const studentName = value("student_name");
  const email = value("email");
  const phone = value("phone");
  if (!studentName || !email || !phone) redirect("/?admission=error#admissions");
  await supabase.from("admission_inquiries").insert({
    student_name: studentName,
    parent_name: value("parent_name"),
    email,
    phone,
    class_name: value("class_name"),
    message: value("message"),
  });
  redirect("/?admission=sent#admissions");
}

export async function updateAdmissionStatus(formData: FormData) {
  await requireAdmin("manage_admissions");
  const admin = createAdminClient();
  await admin.from("admission_inquiries").update({ status: String(formData.get("status")) }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/admissions");
}

export async function deleteAdmission(formData: FormData) {
  await requireAdmin("manage_admissions");
  const admin = createAdminClient();
  await admin.from("admission_inquiries").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/admissions");
}

export async function addContent(table: Table, formData: FormData) {
  await requireAdmin(PERM[table]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const payload: Record<string, any> = {
    title: String(formData.get("title")),
    created_by: user?.id,
  };
  const f = (k: string) => String(formData.get(k) || "");

  if (table === "notices") Object.assign(payload, { body: f("body"), category: f("category") || "notice" });
  if (table === "events") Object.assign(payload, { description: f("body"), event_date: f("event_date") });
  if (table === "achievements") Object.assign(payload, { description: f("body"), achieved_on: f("event_date") });
  if (table === "documents") Object.assign(payload, { audience: f("audience") || "public", category: f("category") || "general" });

  // optional image/file upload
  const file = formData.get("file") as File | null;
  const bucket = table === "gallery" ? "gallery" : "documents";
  if (file && file.size > 0) {
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const storageApi = createAdminClient().storage;
    let storage = storageApi.from(bucket);
    let { error } = await storage.upload(path, file, { contentType: file.type || undefined });
    if (error?.message.toLowerCase().includes("not found") && table === "gallery") {
      await storageApi.createBucket("gallery", { public: true });
      storage = storageApi.from(bucket);
      ({ error } = await storage.upload(path, file, { contentType: file.type || undefined }));
    }
    if (error) redirect(`/admin/${table}?error=${encodeURIComponent(error.message.slice(0, 80))}`);
    const url = storage.getPublicUrl(path).data.publicUrl;
    if (table === "gallery") payload.image_url = url; else payload.file_url = url;
  }
  if (table === "gallery" && !payload.image_url) payload.image_url = f("image_url");

  const { error } = await supabase.from(table).insert(payload);
  if (error) redirect(`/admin/${table}?error=save`);
  if (table === "gallery") revalidatePath("/");
  revalidatePath(`/admin/${table === "achievements" ? "achievements" : table}`);
  redirect(`/admin/${table}?added=1`);
}

export async function deleteContent(table: Table, formData: FormData) {
  await requireAdmin(PERM[table]);
  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", String(formData.get("id")));
  revalidatePath(`/admin/${table}`);
}

export async function toggleNotice(formData: FormData) {
  await requireAdmin("manage_notices");
  const supabase = await createClient();
  const { data } = await supabase.from("notices").select("is_published").eq("id", String(formData.get("id"))).single();
  await supabase.from("notices").update({ is_published: !data?.is_published }).eq("id", String(formData.get("id")));
  revalidatePath("/admin/notices");
}
