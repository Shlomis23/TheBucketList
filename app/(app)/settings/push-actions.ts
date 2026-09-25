"use server";

import { headers } from "next/headers";
import webpush from "web-push";
import { deletePushSubscription, pushSubscriptionSchema, savePushSubscription } from "@/lib/dal/push";
import { getVerifiedUserId } from "@/lib/supabase/server";
import { fail, ok, type Result } from "@/lib/errors/result";

export async function savePushSubscriptionAction(subscription: unknown) {
  const ua = (await headers()).get("user-agent") ?? "";
  return savePushSubscription(subscription, ua);
}

export async function deletePushSubscriptionAction(endpoint: unknown) {
  return deletePushSubscription(endpoint);
}

// "שליחת בדיקה" — רק למכשיר הזה (ה-subscription שהדפדפן עצמו נתן), כדי
// לוודא שההתראות באמת מגיעות. לא נוגע ב-DB ולא בבן/בת הזוג.
export async function sendTestPushAction(subscription: unknown): Promise<Result<{ sent: true }>> {
  const traceId = crypto.randomUUID();
  if (!(await getVerifiedUserId())) return fail("UNAUTHENTICATED", "צריך להתחבר קודם", traceId);
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!parsed.success || !publicKey || !privateKey) return fail("INVALID_INPUT", "ההתראות לא מוגדרות", traceId);

  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://the-bucket-list-seven.vercel.app", publicKey, privateKey);
  try {
    await webpush.sendNotification(
      parsed.data,
      JSON.stringify({ title: "ההתראות עובדות", body: "מעכשיו תדעו כשיש משהו חדש מבן/בת הזוג.", url: "/settings", tag: "test" }),
      { TTL: 300, timeout: 8_000 },
    );
    return ok({ sent: true }, traceId);
  } catch {
    return fail("UNEXPECTED", "שליחת הבדיקה נכשלה", traceId);
  }
}
