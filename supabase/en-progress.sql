-- Tiến độ học TIẾNG ANH theo tài khoản (docs/ENGLISH_SPLIT_PLAN.md, Q2).
-- Bảng riêng, không đụng tới bảng public.progress của tiếng Trung.
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ file → Run.
-- Chạy lại cũng an toàn (không xoá dữ liệu). Trước khi chạy, web vẫn hoạt động: tiến độ tiếng Anh chỉ lưu trên trình duyệt.

create table if not exists public.progress_en (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  -- thời điểm thay đổi cuối ở trình duyệt, dùng để chọn bản mới hơn khi đồng bộ
  updated_at timestamptz not null default now()
);

alter table public.progress_en enable row level security;

drop policy if exists "progress_en: read own" on public.progress_en;
drop policy if exists "progress_en: insert own" on public.progress_en;
drop policy if exists "progress_en: update own" on public.progress_en;

create policy "progress_en: read own" on public.progress_en
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_en: insert own" on public.progress_en
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_en: update own" on public.progress_en
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.progress_en from anon;
grant select, insert, update on public.progress_en to authenticated;
