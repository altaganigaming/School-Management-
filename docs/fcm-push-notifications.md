# FCM Push Notifications Setup

## Firebase setup

1. In Firebase Console, create or select the project used by Well Future Academy ERP. Add a Web app and copy its web configuration values.
2. In **Project settings → Cloud Messaging → Web Push certificates**, generate a VAPID key pair. The public key is used by the website; it is not a server credential.
3. In Google Cloud Console, enable the **Firebase Cloud Messaging API** for the same project. Create a service account with the **Firebase Cloud Messaging API Admin** role and generate a JSON key. Keep that JSON outside the repository and do not paste it into frontend environment variables.

## Website environment

Set these variables in the deployment environment used to build the Next.js website (and in `.env.local` for local HTTPS/localhost testing):

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
```

These are Firebase Web App configuration and the VAPID **public** key. They are expected to be visible to browsers. Never put a Firebase service-account JSON, private key, FCM OAuth token, or Supabase service-role key in any `NEXT_PUBLIC_*` variable.

After setting them, restart the dev server or rebuild/redeploy the website. Push requires HTTPS in production; localhost is permitted by browsers for local development.

## Supabase migration and secrets

Link the CLI to the correct Supabase project if this workspace is not already linked, then apply the schema migration:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --linked
```

Create a protected env file outside the repository, for example `/secure/path/wfa-push-secrets.env`, with mode `600`:

```dotenv
APP_ORIGIN=https://your-erp-domain.example
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

`FCM_SERVICE_ACCOUNT_JSON` must contain the full downloaded service-account JSON on one line. Set it as an Edge Function secret and deploy the function:

```sh
npx supabase secrets set --env-file /secure/path/wfa-push-secrets.env --project-ref YOUR_PROJECT_REF
npx supabase functions deploy send-push --project-ref YOUR_PROJECT_REF
```

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy either into browser code. The function accepts only a Supabase-verified service-role JWT and derives recipients from the persisted leave/homework record; it does not accept recipient IDs from the browser.

## Enable and install

Sign in on HTTPS, then choose **Enable Notifications** and allow the browser permission prompt. Each profile/device has its own FCM token registration; repeat on each device. Use **Install App** when offered. Otherwise use the browser menu’s **Install app** or **Add to Home screen** option; on iPhone/iPad use **Share → Add to Home Screen**. Notifications and installation are controlled separately.

## Test with the website closed

1. Enable notifications on a test student device and on a principal (or staff/teacher account that has `manage_leave`) device. Confirm both show the enabled status.
2. Close every ERP tab. On desktop, also ensure the browser is allowed to run background apps; on mobile, test the installed PWA for the most reliable closed-window behavior.
3. Submit a student leave request. The manager device should receive one alert. Approve or reject it from a separate signed-in manager session; the student device should receive one status alert. Tapping either alert should open the relevant ERP page after authentication.
4. Put a test student in class A and another in class B. Publish homework for class A as a teacher assigned to that class. Only active class A student devices should receive an alert; class B devices should not.
5. Repeat a request with multiple registered devices for the same profile; each device should receive one alert. Remove a device with **Disable** and confirm it stops receiving future alerts.
6. To verify duplicate suppression, replay the same event type and saved record ID only from a trusted server-role test client. Confirm `push_notification_deliveries` contains one row per event/device pair. Never put a service-role key in browser code or use it from browser devtools.

Browser/OS policy can delay or suppress background delivery when the browser is force-quit, battery-restricted, or notifications are disabled. Validate on the actual target device and browser; a successful HTTP response alone does not prove closed-site delivery.