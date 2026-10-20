"use client";
/**
 * Web Push study reminder (docs/PUSH_REMINDER_PLAN.md). The browser subscription, time zone and reminder time
 * go to `public.push_reminders` (supabase/push.sql); `last_study_date` is kept up to date so the server only
 * nudges people who have not studied today.
 */
import { supabase } from "@/features/account/account";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const pushSupported = () =>
  typeof window !== "undefined" && Boolean(VAPID_PUBLIC_KEY) && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Is this browser subscribed and does the server know about it? */
export async function pushEnabled(uid: string): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const sub = await currentSubscription();
  if (!sub) return false;
  const { data } = await supabase().from("push_reminders").select("endpoint").eq("user_id", uid).maybeSingle();
  return data?.endpoint === sub.endpoint;
}

/** Asks permission, subscribes and saves; returns an error message or null. */
export async function enablePush(uid: string, time: string, studiedToday: string | null): Promise<string | null> {
  if (!pushSupported()) return "Trình duyệt này chưa hỗ trợ thông báo (iPhone: thêm app vào màn hình chính trước).";
  if ((await Notification.requestPermission()) !== "granted") return "Bạn chưa cho phép thông báo trong trình duyệt.";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    const { error } = await supabase().from("push_reminders").upsert({
      user_id: uid,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      remind_time: time,
      last_study_date: studiedToday,
      last_sent_date: null,
      updated_at: new Date().toISOString(),
    });
    return error ? `Không lưu được lời nhắc: ${error.message}` : null;
  } catch (e) {
    return `Không bật được thông báo: ${e instanceof Error ? e.message : "lỗi không rõ"}`;
  }
}

export async function disablePush(uid: string): Promise<void> {
  await supabase().from("push_reminders").delete().eq("user_id", uid);
  const sub = await currentSubscription();
  await sub?.unsubscribe().catch(() => false);
}

/** Tells the server the learner studied on `date` (local YYYY-MM-DD). No row = no reminders = nothing happens. */
export async function reportStudied(uid: string, date: string): Promise<void> {
  await supabase().from("push_reminders").update({ last_study_date: date }).eq("user_id", uid);
}
