-- Tiến độ truyện trinh thám theo tài khoản (docs/DETECTIVE_STORIES_PLAN.md).
-- Chạy MỘT LẦN trong Supabase → SQL Editor. Chạy lại an toàn. Chưa chạy thì tiến độ truyện chỉ lưu trên trình duyệt.

create table if not exists public.progress_stories (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.progress_stories enable row level security;

drop policy if exists "progress_stories: own" on public.progress_stories;
create policy "progress_stories: own" on public.progress_stories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.progress_stories from anon;
grant select, insert, update on public.progress_stories to authenticated;
