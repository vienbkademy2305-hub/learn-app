-- Nhắc học qua Web Push theo từng tài khoản (docs/PUSH_REMINDER_PLAN.md).
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ file → Run. Chạy lại an toàn.
-- Mỗi tài khoản một thiết bị đăng ký nhận nhắc; hàm `push-reminder` (chạy theo cron) đọc bảng này bằng service role.

create table if not exists public.push_reminders (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  endpoint        text        not null,
  p256dh          text        not null,
  auth            text        not null,
  -- múi giờ IANA của trình duyệt (vd Asia/Ho_Chi_Minh) và giờ nhắc theo giờ địa phương "HH:MM"
  tz              text        not null,
  remind_time     text        not null check (remind_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  -- ngày (địa phương, YYYY-MM-DD) gần nhất người học có XP; hàm chỉ nhắc khi khác hôm nay
  last_study_date text,
  -- ngày gần nhất đã gửi nhắc, để không gửi hai lần trong một ngày
  last_sent_date  text,
  updated_at      timestamptz not null default now()
);

alter table public.push_reminders enable row level security;

drop policy if exists "push_reminders: own" on public.push_reminders;
create policy "push_reminders: own" on public.push_reminders
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.push_reminders from anon;
grant select, insert, update, delete on public.push_reminders to authenticated;

-- Lịch chạy: 15 phút một lần. Cần bật extension pg_cron và pg_net (Database → Extensions).
-- Thay <PROJECT_REF> và <PUSH_CRON_SECRET> (cùng giá trị đã đặt bằng `supabase secrets set PUSH_CRON_SECRET=...`)
-- rồi chạy riêng đoạn này:
--
-- select cron.schedule('push-reminder', '*/15 * * * *', $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/push-reminder',
--     headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', '<PUSH_CRON_SECRET>'),
--     body := '{}'::jsonb
--   );
-- $$);
