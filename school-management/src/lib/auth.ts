import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPerm, type Role } from "@/lib/permissions";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: Role;
  permissions: string[];
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!data || !data.is_active) return null;
  return data as Profile;
}

export async function requireLogin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(permission?: string): Promise<Profile> {
  const profile = await requireLogin();
  if (profile.role === "student") redirect("/portal");
  if (profile.role === "super_admin") return profile;
  if (permission && !hasPerm(profile.role, profile.permissions, permission)) {
    redirect("/admin?denied=1");
  }
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireLogin();
  if (profile.role !== "super_admin") redirect("/admin");
  return profile;
}

export async function requireStudent(): Promise<Profile> {
  const profile = await requireLogin();
  if (profile.role !== "student") redirect("/admin");
  return profile;
}

export async function getSettings(): Promise<Record<string, any>> {
  const supabase = await createClient();
  const { data } = await supabase.from("school_settings").select("key, value");
  const out: Record<string, any> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}

export async function uploadFile(bucket: string, file: File, folder = ""): Promise<string | null> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop();
  const path = folder ? `${folder}/${Date.now()}.${ext}` : `${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
