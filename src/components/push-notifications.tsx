"use client";

import { useEffect, useRef, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/lib/actions/push";

type FirebaseCompat = {
  apps: unknown[];
  initializeApp(config: Record<string, string>): unknown;
  messaging(): {
    getToken(options: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration }): Promise<string>;
    onMessage(callback: (payload: { data?: Record<string, string> }) => void): () => void;
  };
};

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";
const FIREBASE_SDK = "10.14.1";
const scriptLoads = new Map<string, Promise<void>>();

function configReady() {
  return Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.messagingSenderId && FIREBASE_CONFIG.appId && VAPID_KEY);
}

function loadScript(src: string) {
  const inFlight = scriptLoads.get(src);
  if (inFlight) return inFlight;
  const load = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => {
      scriptLoads.delete(src);
      reject(new Error("Firebase SDK could not load."));
    };
    if (!existing) document.head.appendChild(script);
  });
  scriptLoads.set(src, load);
  return load;
}

function firebaseWorkerUrl() {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);
  Object.entries(FIREBASE_CONFIG).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalledPwa() {
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function deviceKey(profileId: string) {
  const key = `wfa-erp-push-device:${profileId}`;
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = window.crypto.randomUUID();
    window.localStorage.setItem(key, value);
  }
  return value;
}

export function PushNotifications({ profileId, compact = false }: { profileId: string; compact?: boolean }) {
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const foregroundUnsubscribe = useRef<(() => void) | null>(null);
  const configured = configReady();

  useEffect(() => {
    if (!configured || !("serviceWorker" in navigator)) return;
    const url = firebaseWorkerUrl();
    navigator.serviceWorker.register(url, { scope: "/" }).catch(() => undefined);
  }, [configured]);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  useEffect(() => () => foregroundUnsubscribe.current?.(), []);

  useEffect(() => {
    if (!configured || !("Notification" in window) || Notification.permission !== "default") return;
    const promptKey = `wfa-erp-push-prompt:${profileId}`;
    if (window.localStorage.getItem(promptKey) !== "dismissed") setShowPrompt(true);
  }, [configured, profileId]);

  async function enableNotifications() {
    if (isEnabling) return;
    if (!configured) {
      setMessage("Firebase web settings are not configured yet. See the setup guide.");
      return;
    }
    if (!window.isSecureContext || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage("Push notifications require HTTPS and a browser that supports notifications.");
      return;
    }
    if (isIOSDevice() && !isInstalledPwa()) {
      setMessage("On iPhone/iPad, install this ERP with Share → Add to Home Screen first, then enable notifications from the installed app.");
      return;
    }
    if (Notification.permission === "denied") {
      setMessage("Notifications are blocked. Allow them for this site in browser settings, then try again.");
      return;
    }

    setIsEnabling(true);
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted. You can allow it later in browser settings.");
        return;
      }
      await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK}/firebase-messaging-compat.js`);
      const firebase = (window as Window & { firebase?: FirebaseCompat }).firebase;
      if (!firebase) throw new Error("Firebase SDK is unavailable.");
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const registration = await navigator.serviceWorker.register(firebaseWorkerUrl(), { scope: "/" });
      await navigator.serviceWorker.ready;
      const token = await firebase.messaging().getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (!token) throw new Error("Firebase did not return a device token.");
      const result = await savePushSubscription(token, deviceKey(profileId));
      if (!result.ok) throw new Error(result.message);
      setMessage(result.message);
      window.localStorage.setItem(`wfa-erp-push-prompt:${profileId}`, "enabled");
      setShowPrompt(false);
      if (!foregroundUnsubscribe.current) {
        foregroundUnsubscribe.current = firebase.messaging().onMessage((payload) => {
          if (!payload.data || Notification.permission !== "granted") return;
          const notification = new Notification(payload.data.title || "Well Future Academy", {
            body: payload.data.body || "You have a new ERP update.",
            icon: "/academy-icon.svg",
          });
          notification.onclick = () => {
            notification.close();
            const target = new URL(payload.data?.url || "/portal", window.location.origin);
            if (target.origin === window.location.origin) window.location.assign(target.href);
          };
        });
      }
    } catch (error) {
      console.error("Unable to enable Firebase notifications:", error);
      setMessage("Notifications could not be enabled. Check the Firebase setup and try again.");
    } finally {
      setIsEnabling(false);
    }
  }

  async function disableNotifications() {
    try {
      const key = window.localStorage.getItem(`wfa-erp-push-device:${profileId}`);
      if (!key) return;
      const result = await removePushSubscription(key);
      if (result.ok) setMessage("This device was removed from notifications.");
    } catch {
      setMessage("This device could not be removed. Try again later.");
    }
  }

  async function installApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        setMessage(choice.outcome === "accepted" ? "Well Future Academy ERP was installed." : "Installation was dismissed. You can install it later from the browser menu.");
      } catch {
        setMessage("The install prompt could not be opened. Use the browser menu’s Install app option.");
      } finally {
        setInstallPrompt(null);
      }
      return;
    }
    setMessage(isIOSDevice()
      ? "To install on iPhone/iPad: tap Share, then Add to Home Screen."
      : "To install: open the browser menu and choose Install app or Add to Home screen.");
  }

  function dismissPrompt() {
    window.localStorage.setItem(`wfa-erp-push-prompt:${profileId}`, "dismissed");
    setShowPrompt(false);
  }

  return (
    <>
      <div className={compact ? "relative" : "mt-4 border-t border-slate-800 pt-3"}>
        <div className={`flex ${compact ? "gap-1" : "flex-wrap gap-2"}`}>
          <button type="button" onClick={enableNotifications} disabled={isEnabling}
            className="btn-secondary btn-sm" title="Enable push notifications on this device">
            {isEnabling ? "Enabling…" : compact ? "🔔" : "Enable Notifications"}
          </button>
          <button type="button" onClick={installApp} className="btn-secondary btn-sm" title="Install Well Future Academy ERP">
            {compact ? "Install" : "Install App"}
          </button>
          {!compact && <button type="button" onClick={disableNotifications} className="btn-secondary btn-sm" title="Remove this device from push notifications">Disable</button>}
        </div>
        {!compact && <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Install guidance: use the browser menu’s Install app option; on iPhone/iPad use Share → Add to Home Screen. Notifications require HTTPS and permission on each device.</p>}
        {message && <p role="status" className={compact ? "absolute right-0 top-full z-40 mt-2 w-64 rounded-lg bg-white p-3 text-xs text-slate-700 shadow-lg ring-1 ring-slate-200" : "mt-2 text-xs text-slate-300"}>{message}</p>}
      </div>
      {showPrompt && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="push-prompt-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase text-primary-700">Well Future Academy</p><h2 id="push-prompt-title" className="mt-2 text-xl font-bold text-slate-900">Enable notifications?</h2></div>
            <span className="text-2xl" aria-hidden="true">🔔</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Get relevant school updates on this device, including leave status or homework for your class.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={dismissPrompt} className="btn-secondary">Not now</button>
            {isIOSDevice() && !isInstalledPwa() && <button type="button" onClick={installApp} className="btn-secondary">Install App</button>}
            <button type="button" onClick={enableNotifications} disabled={isEnabling} className="btn-primary">{isEnabling ? "Enabling…" : "Enable Notifications"}</button>
          </div>
          <p className="mt-3 text-xs text-slate-400">You can change notification permission later in your browser settings.</p>
        </section>
      </div>}
    </>
  );
}