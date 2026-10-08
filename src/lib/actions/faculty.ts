"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeStoredFile } from "@/lib/storage";

export async function addFacultyProfile(formData: FormData) {
  const principal = await requireSuperAdmin();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const image = formData.get("image");
  if (!name || !(image instanceof File) || !image.size) redirect("/admin/faculty?error=required");
  if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) redirect("/admin/faculty?error=image");

  const admin = createAdminClient();
  const extension = image.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const path = `faculty/cms/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from("gallery").upload(path, image, { contentType: image.type });
  if (uploadError) redirect("/admin/faculty?error=upload");
  const imageUrl = admin.storage.from("gallery").getPublicUrl(path).data.publicUrl;
  const { error: insertError } = await admin.from("faculty_profiles").insert({
    name,
    image_url: imageUrl,
    description,
    created_by: principal.id,
  });
  if (insertError) {
    await admin.storage.from("gallery").remove([path]);
    const schemaMissing = insertError.code === "42P01" || insertError.code === "PGRST205";
    redirect(`/admin/faculty?error=${schemaMissing ? "schema" : "save"}`);
  }

  revalidatePath("/admin/faculty");
  revalidatePath("/");
  redirect("/admin/faculty?added=1");
}

export async function deleteFacultyProfile(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") || "");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("faculty_profiles").select("image_url").eq("id", id).maybeSingle();
  if (!profile) return;
  if (profile.image_url && !(await removeStoredFile(profile.image_url))) redirect("/admin/faculty?error=delete");
  const { error } = await admin.from("faculty_profiles").delete().eq("id", id);
  if (error) redirect("/admin/faculty?error=delete");
  revalidatePath("/admin/faculty");
  revalidatePath("/");
  redirect("/admin/faculty?deleted=1");
}