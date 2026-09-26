"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/(app)/settings/push-actions";

// התראות במכשיר הזה (25.9). כל מכשיר נרשם בנפרד — האייפון של שלומי והאנדרואיד
// של בן/בת הזוג כל אחד בעצמו. באייפון Web Push עובד רק כשהאפליקציה מותקנת
// במסך הבית (iOS 16.4+), אז שם קודם מסבירים איך להתקין.

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export function PushSettings({ publicKey, partnerName }: { publicKey: string | null; partnerName: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: State;
      let sub: PushSubscription | null = null;
      if (!supported || !publicKey) next = isIOS() && !isStandalone() ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.getRegistration("/");
        sub = (await reg?.pushManager.getSubscription()) ?? null;
        next = sub && Notification.permission === "granted" ? "on" : "off";
        // "פעילות" בדפדפן לא מבטיח שהשרת יודע על המכשיר (למשל אחרי איפוס
        // נתונים) — שומרים שוב, כדי שמה שמוצג כאן יהיה נכון גם בשרת.
        if (next === "on" && sub) {
          const saved = await savePushSubscriptionAction(sub.toJSON());
          if (!saved.ok) next = "off";
        }
      }
      if (!cancelled) {
        setSubscription(sub);
        setState(next);
      }
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  function enable() {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        // חייב לקרות מתוך הלחיצה עצמה (בעיקר באייפון).
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await getRegistration();
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) }));
        const result = await savePushSubscriptionAction(sub.toJSON());
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setSubscription(sub);
        setState("on");
        setMessage("ההתראות הופעלו במכשיר הזה.");
      } catch {
        setError("לא הצלחנו להפעיל התראות במכשיר הזה.");
      }
    });
  }

  function disable() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe().catch(() => {});
      if (endpoint) await deletePushSubscriptionAction(endpoint);
      setSubscription(null);
      setState("off");
    });
  }

  function test() {
    if (!subscription) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await sendTestPushAction(subscription.toJSON());
      if (result.ok) setMessage("נשלחה התראת בדיקה — היא אמורה להופיע תוך כמה שניות.");
      else setError(result.error.message);
    });
  }

  return (
    <div>
      {state === "loading" && <p className="status-msg m-0">בודק…</p>}

      {state === "ios-install" && (
        <p className="status-msg m-0 text-sm">
          באייפון התראות עובדות רק כשהאפליקציה מותקנת: בספארי לוחצים על כפתור השיתוף ← &quot;הוספה למסך הבית&quot;,
          ופותחים את האפליקציה מהאייקון. אז אפשר להפעיל כאן.
        </p>
      )}

      {state === "unsupported" && (
        <p className="status-msg m-0 text-sm">
          הדפדפן הזה לא תומך בהתראות. בטלפון זה עובד בכרום (אנדרואיד) או באפליקציה המותקנת (אייפון).
        </p>
      )}

      {state === "denied" && (
        <p className="status-msg m-0 text-sm">
          ההתראות חסומות במכשיר הזה. כדי לפתוח: בהגדרות הטלפון/הדפדפן ← התראות ← The Bucket List ← לאפשר.
        </p>
      )}

      {state === "off" && (
        <>
          <p className="status-msg m-0 mb-12 text-sm">
            התראה על כל דבר חדש {partnerName ? `מ${partnerName}` : "מבן/בת הזוג"} — רעיון, הודעה בשיחה, תוכנית או זיכרון — וגם על מאצ&apos; ותזכורת יום לפני תוכנית.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={enable} disabled={pending}>
            {pending ? "מפעיל…" : "הפעלת התראות במכשיר הזה"}
          </button>
        </>
      )}

      {state === "on" && (
        <>
          <p className="m-0 mb-12 text-md fw-700 c-primary">
            ההתראות פעילות במכשיר הזה
          </p>
          <div className="flex gap-8">
            <button
              type="button"
              className="btn flex-1 bg-soft c-primary"
              onClick={test}
              disabled={pending}
            >
              שליחת בדיקה
            </button>
            <button
              type="button"
              className="btn btn-outline flex-1"
              onClick={disable}
              disabled={pending}
            >
              כיבוי
            </button>
          </div>
        </>
      )}

      {message && (
        <p role="status" className="status-msg m-0 mt-12 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="alert-error mt-12">
          {error}
        </p>
      )}
    </div>
  );
}
