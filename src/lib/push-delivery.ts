import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushEventType = "leave_submitted" | "leave_reviewed" | "homework_published";

export async function triggerPush(eventType: PushEventType, recordId: string) {
  try {
    const { error } = await createAdminClient().functions.invoke("send-push", {
      body: { eventType, recordId },
    });
    if (error) console.error("Push function invocation failed:", error.message);
  } catch (error) {
    console.error("Push function invocation failed:", error instanceof Error ? error.message : "unknown error");
  }
}