import { createAdminClient } from "@/lib/supabase/admin";

export function getStorageObject(url: string | null | undefined) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

export async function removeStoredFile(url: string | null | undefined) {
  const object = getStorageObject(url);
  if (!object) return true;
  const { error } = await createAdminClient().storage.from(object.bucket).remove([object.path]);
  return !error;
}