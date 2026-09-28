import { createClient } from "@/lib/supabase/server";

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);

export async function listGalleryImages(limit = 1000) {
  const supabase = await createClient();
  const { data: files, error } = await supabase.storage.from("gallery").list("", {
    limit,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) return [];

  return (files || [])
    .filter((file) => {
      if (!file.id || file.name.includes("/")) return false;
      const mimeType = file.metadata?.mimetype;
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      return mimeType ? mimeType.startsWith("image/") : IMAGE_EXTENSIONS.has(extension);
    })
    .map((file) => ({
      name: file.name,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      url: supabase.storage.from("gallery").getPublicUrl(file.name).data.publicUrl,
    }));
}