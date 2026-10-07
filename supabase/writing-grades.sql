-- Bài viết đã chấm tự động (docs/EN_WRITING_GRADER_PLAN.md).
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ file → Run. Chạy lại cũng an toàn.
-- Chỉ Edge Function `grade-writing` (khóa service role) ghi vào bảng; mỗi tài khoản chỉ đọc/xoá bài của mình.

create table if not exists public.writing_grades (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  lesson     text        not null,   -- slug buổi học, VD buoi-18-...
  kind       text        not null,   -- paragraph | task1 | task2 | speaking
  prompt     text        not null,
  text       text        not null,
  result     jsonb       not null,
  model      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists writing_grades_user_time on public.writing_grades (user_id, created_at desc);

alter table public.writing_grades enable row level security;

drop policy if exists "writing_grades: read own" on public.writing_grades;
drop policy if exists "writing_grades: delete own" on public.writing_grades;

create policy "writing_grades: read own" on public.writing_grades
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "writing_grades: delete own" on public.writing_grades
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.writing_grades from anon, authenticated;
grant select, delete on public.writing_grades to authenticated;
