import { createClient } from "npm:@supabase/supabase-js@2";

type EventType = "leave_submitted" | "leave_reviewed" | "homework_published";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appOrigin = Deno.env.get("APP_ORIGIN")!;
const serviceAccountRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")!;
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

let oauthToken = "";
let oauthExpiresAt = 0;

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodeJson(value: unknown) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split(".")[1];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

async function getFcmAccessToken() {
  if (oauthToken && oauthExpiresAt > Date.now() + 60_000) return oauthToken;
  const account = JSON.parse(serviceAccountRaw) as { client_email: string; private_key: string; token_uri?: string; project_id: string };
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const claims = encodeJson({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const unsigned = `${header}.${claims}`;
  const pem = account.private_key.replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error("Google OAuth token exchange failed.");
  const data = await response.json();
  oauthToken = data.access_token;
  oauthExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return oauthToken;
}

async function eventMessage(eventType: EventType, recordId: string) {
  if (eventType === "leave_submitted" || eventType === "leave_reviewed") {
    const { data: leave, error } = await admin.from("leave_requests")
      .select("id, profile_id, status, from_date, to_date, profiles(full_name, role)")
      .eq("id", recordId).maybeSingle();
    if (error || !leave) return null;
    const requester = Array.isArray(leave.profiles) ? leave.profiles[0] : leave.profiles;
    if (eventType === "leave_submitted") {
      if (leave.status !== "pending") return null;
      const { data: profiles } = await admin.from("profiles").select("id, role, permissions").eq("is_active", true);
      const recipients = (profiles || []).filter((profile) => profile.role === "super_admin"
        || ((profile.role === "teacher" || profile.role === "staff") && (profile.permissions || []).includes("manage_leave")))
        .map((profile) => profile.id);
      return {
        eventKey: `leave-submitted:${leave.id}`,
        recipients,
        title: "New leave request",
        body: `${requester?.full_name || "A user"} · ${leave.from_date} to ${leave.to_date}`,
        path: "/admin/leave",
      };
    }
    if (leave.status !== "approved" && leave.status !== "rejected") return null;
    const { data: requesterProfile } = await admin.from("profiles").select("is_active, role").eq("id", leave.profile_id).maybeSingle();
    if (!requesterProfile?.is_active) return null;
    const status = leave.status;
    return {
      eventKey: `leave-reviewed:${leave.id}:${status}`,
      recipients: [leave.profile_id],
      title: `Leave request ${status}`,
      body: `Your request for ${leave.from_date} to ${leave.to_date} was ${status}.`,
      path: requesterProfile.role === "student" ? "/portal/attendance" : "/admin/leave",
    };
  }

  const { data: homework, error } = await admin.from("homework")
    .select("id, class_id, title, due_date, classes(name, section)").eq("id", recordId).maybeSingle();
  if (error || !homework) return null;
  const { data: students } = await admin.from("students")
    .select("profile_id, profiles!inner(is_active)")
    .eq("class_id", homework.class_id)
    .eq("profiles.is_active", true)
    .not("profile_id", "is", null);
  const classInfo = Array.isArray(homework.classes) ? homework.classes[0] : homework.classes;
  return {
    eventKey: `homework-published:${homework.id}`,
    recipients: [...new Set((students || []).map((student) => student.profile_id).filter(Boolean))],
    title: "New homework published",
    body: `${homework.title} · ${classInfo?.name || "Your class"}${classInfo?.section ? ` ${classInfo.section}` : ""}`,
    path: "/portal/homework",
  };
}

async function sendToFcm(token: string, accessToken: string, projectId: string, data: Record<string, string>) {
  return await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        data,
        webpush: { headers: { TTL: "3600", Urgency: "high" } },
      },
    }),
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = request.headers.get("authorization") || "";
  const claims = decodeJwtPayload(authorization.replace(/^Bearer\s+/i, ""));
  // Supabase's gateway validates the JWT signature; require server-role callers, never browser user tokens.
  if (claims?.role !== "service_role") return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json() as { eventType?: EventType; recordId?: string };
    if (!body.recordId || !["leave_submitted", "leave_reviewed", "homework_published"].includes(body.eventType || "")) {
      return Response.json({ error: "Invalid notification event" }, { status: 400 });
    }
    const eventType = body.eventType as EventType;
    const notification = await eventMessage(eventType, body.recordId);
    if (!notification || !notification.recipients.length) return Response.json({ sent: 0, skipped: true });

    const { data: subscriptions, error: subscriptionError } = await admin.from("push_subscriptions")
      .select("id, profile_id, fcm_token").in("profile_id", notification.recipients);
    if (subscriptionError) throw new Error("Could not resolve notification subscriptions.");
    if (!subscriptions?.length) return Response.json({ sent: 0, skipped: true });

    const { data: freshDeliveries, error: deliveryError } = await admin.from("push_notification_deliveries")
      .upsert(subscriptions.map((subscription) => ({ event_key: notification.eventKey, subscription_id: subscription.id })), {
        onConflict: "event_key,subscription_id", ignoreDuplicates: true,
      }).select("id, subscription_id");
    if (deliveryError) throw new Error("Could not create notification delivery records.");
    if (!freshDeliveries?.length) return Response.json({ sent: 0, duplicate: true });

    const account = JSON.parse(serviceAccountRaw) as { project_id: string };
    const origin = new URL(appOrigin).origin;
    const url = new URL(notification.path, origin).toString();
    const accessToken = await getFcmAccessToken();
    const subscriptionById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
    let sent = 0;
    for (const delivery of freshDeliveries) {
      const subscription = subscriptionById.get(delivery.subscription_id);
      if (!subscription) continue;
      const response = await sendToFcm(subscription.fcm_token, accessToken, account.project_id, {
        title: notification.title,
        body: notification.body,
        url,
        eventKey: notification.eventKey,
      });
      const responseBody = await response.json().catch(() => ({}));
      const isSent = response.ok;
      await admin.from("push_notification_deliveries").update({ status: isSent ? "sent" : "failed", sent_at: isSent ? new Date().toISOString() : null }).eq("id", delivery.id);
      if (isSent) sent++;
      const errorStatus = responseBody?.error?.status;
      if (errorStatus === "UNREGISTERED" || errorStatus === "NOT_FOUND") {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
      }
    }
    return Response.json({ sent });
  } catch (error) {
    console.error("Push delivery failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Push delivery failed" }, { status: 500 });
  }
});