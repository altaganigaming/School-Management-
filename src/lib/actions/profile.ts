"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStorageObject } from "@/lib/storage";

function isOwnAvatarPath(profileId: string, bucket: string, path: string) {
  return bucket === "avatars" && (path.startsWith(`${profileId}/`) || path.startsWith(`faculty/${profileId}/`));
}

export async function updateTeacherProfile(formData: FormData) {
  const profile = await requireLogin();
  if (profile.role !== "teacher") redirect("/admin");

  const supabase = await createClient();
  const editableFields = new Set(profile.self_editable_fields || []);
  const changes: Record<string, string | null> = {};
  if (editableFields.has("full_name")) {
    const fullName = String(formData.get("full_name") || "").trim();
    if (!fullName) redirect("/admin/profile?error=invalid");
    changes.full_name = fullName;
  }
  if (editableFields.has("phone")) changes.phone = String(formData.get("phone") || "").trim() || null;

  const avatar = formData.get("avatar");
  const removeAvatar = formData.get("remove_avatar") === "true" && !(avatar instanceof File && avatar.size > 0);
  let uploadedPath: string | null = null;
  let nextAvatarUrl: string | null | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/") || avatar.size > 5 * 1024 * 1024) redirect("/admin/profile?error=image");
    const extension = avatar.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    uploadedPath = `${profile.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("avatars").upload(uploadedPath, avatar, { contentType: avatar.type });
    if (error) redirect("/admin/profile?error=storage");
    nextAvatarUrl = supabase.storage.from("avatars").getPublicUrl(uploadedPath).data.publicUrl;
  } else if (removeAvatar) {
    nextAvatarUrl = null;
  }
  if (nextAvatarUrl !== undefined) changes.avatar_url = nextAvatarUrl;
  if (!Object.keys(changes).length) redirect("/admin/profile?updated=1");

  const { error: updateError } = await supabase.from("profiles").update(changes).eq("id", profile.id).eq("role", "teacher");
  if (updateError) {
    if (uploadedPath) await supabase.storage.from("avatars").remove([uploadedPath]);
    redirect("/admin/profile?error=save");
  }

  if (nextAvatarUrl !== undefined && profile.avatar_url) {
    const oldObject = getStorageObject(profile.avatar_url);
    if (oldObject && isOwnAvatarPath(profile.id, oldObject.bucket, oldObject.path)) {
      const { error } = await supabase.storage.from(oldObject.bucket).remove([oldObject.path]);
      if (error) {
        await supabase.from("profiles").update({ avatar_url: profile.avatar_url }).eq("id", profile.id).eq("role", "teacher");
        if (uploadedPath) await supabase.storage.from("avatars").remove([uploadedPath]);
        redirect("/admin/profile?error=storage");
      }
    }
  }

  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin/profile?updated=1");
}