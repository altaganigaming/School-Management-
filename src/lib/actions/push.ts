"use server";

import { requireLogin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEVICE_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function savePushSubscription(token: string, deviceKey: string) {
  const profile = await requireLogin();
  if (!DEVICE_KEY.test(deviceKey) || token.length < 40 || token.length > 4096 || /\s/.test(token)) {
    return { ok: false, message: "This browser could not be registered. Please try again." };
  }

  const admin = createAdminClient();
  const { error: removePreviousOwnerError } = await admin.from("push_subscriptions")
    .delete().eq("fcm_token", token).neq("profile_id", profile.id);
  if (removePreviousOwnerError) return { ok: false, message: "Notifications could not be enabled. Try again later." };

  const { error } = await admin.from("push_subscriptions").upsert({
    profile_id: profile.id,
    device_key: deviceKey,
    fcm_token: token,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "profile_id,device_key" });
  if (error) return { ok: false, message: "Notifications could not be enabled. Try again later." };
  return { ok: true, message: "Notifications are enabled on this device." };
}

export async function removePushSubscription(deviceKey: string) {
  const profile = await requireLogin();
  if (!DEVICE_KEY.test(deviceKey)) return { ok: false };
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").delete()
    .eq("profile_id", profile.id).eq("device_key", deviceKey);
  return { ok: !error };
}