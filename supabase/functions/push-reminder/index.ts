/**
 * Supabase Edge Function `push-reminder` (docs/PUSH_REMINDER_PLAN.md). Called every 15 minutes by pg_cron
 * (supabase/push.sql). Sends a Web Push to each account whose reminder time has passed and that has not
 * studied today. Deploy with --no-verify-jwt: this function checks the `x-cron-secret` header itself.
 * Secrets: PUSH_CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { isDue, localNow, type ReminderRow } from "./due.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@example.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));

interface Row extends ReminderRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const MESSAGE = JSON.stringify({
  title: "Đến giờ học rồi 🔥",
  body: "Hôm nay bạn chưa học. Chỉ cần vài phút để giữ chuỗi ngày học!",
  url: "/hom-nay/",
});

Deno.serve(async (req) => {
  const secret = env("PUSH_CRON_SECRET");
  if (secret.length < 16 || req.headers.get("x-cron-secret") !== secret) return new Response("forbidden", { status: 403 });

  const { data, error } = await admin.from("push_reminders").select("*");
  if (error) return new Response(error.message, { status: 500 });

  const now = new Date();
  let sent = 0;
  let removed = 0;
  for (const row of (data ?? []) as Row[]) {
    if (!isDue(row, now)) continue;
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, MESSAGE, { TTL: 6 * 3600 });
      await admin.from("push_reminders").update({ last_sent_date: localNow(now, row.tz)!.date }).eq("user_id", row.user_id);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // the browser dropped the subscription
        await admin.from("push_reminders").delete().eq("user_id", row.user_id);
        removed++;
      }
    }
  }
  return Response.json({ checked: data?.length ?? 0, sent, removed });
});
