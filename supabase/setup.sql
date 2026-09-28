-- Tài khoản & tiến độ học (docs/ACCOUNTS_PLAN.md).
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ file → Run.
-- Chạy lại cũng an toàn (không xoá dữ liệu).

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  -- thời điểm thay đổi cuối ở trình duyệt (client gửi lên), dùng để chọn bản mới hơn khi đồng bộ
  updated_at timestamptz not null default now()
);

-- Mỗi người chỉ đọc/ghi được đúng dòng của mình.
alter table public.progress enable row level security;

drop policy if exists "progress: read own" on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;

create policy "progress: read own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Không cho khách (chưa đăng nhập) chạm vào bảng.
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;
