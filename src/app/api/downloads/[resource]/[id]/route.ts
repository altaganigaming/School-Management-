import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStorageObject } from "@/lib/storage";

const TABLES = {
  documents: "documents",
  materials: "study_materials",
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  if (resource !== "documents" && resource !== "materials") return new Response(null, { status: 404 });

  const table = TABLES[resource as keyof typeof TABLES];
  const supabase = await createClient();
  const { data: file } = await supabase.from(table).select("file_url, title").eq("id", id).maybeSingle();
  const object = getStorageObject(file?.file_url);
  if (!file || !object || object.bucket !== "documents") return new Response(null, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("documents").createSignedUrl(object.path, 60, { download: file.title });
  if (error || !data?.signedUrl) return new Response(null, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}