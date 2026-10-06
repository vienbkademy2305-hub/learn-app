-- TTS service (docs/TTS_SERVICE_PLAN.md): audio cache + monthly character cap for the paid TTS provider.
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ file → Run. Chạy lại cũng an toàn.
-- Chỉ Edge Function `tts` (khóa service role) ghi vào các bảng này; trình duyệt chỉ đọc file mp3 công khai.

-- 1. Bucket lưu mp3: đọc công khai (ai cũng nghe được file đã tạo), chỉ service role được ghi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tts', 'tts', true, 2097152, array['audio/mpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['audio/mpeg'];

-- 2. Mỗi đoạn audio đã tạo (khóa = sha256(giọng + "\n" + văn bản), trùng tên file trong bucket).
create table if not exists public.tts_clips (
  key        text primary key,
  voice      text        not null,
  chars      integer     not null,
  created_at timestamptz not null default now()
);

-- 3. Số ký tự đã gửi cho nhà cung cấp, theo tháng (UTC, dạng '2026-10').
create table if not exists public.tts_usage (
  month      text primary key,
  chars      bigint      not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tts_clips enable row level security;
alter table public.tts_usage enable row level security;
-- Không có policy nào: anon/authenticated không đọc/ghi được; service role bỏ qua RLS.
revoke all on public.tts_clips from anon, authenticated;
revoke all on public.tts_usage from anon, authenticated;

-- 4. Giữ chỗ hạn mức TRƯỚC khi gọi nhà cung cấp, nguyên tử (hai yêu cầu cùng lúc không vượt được trần).
--    Trả về true nếu còn đủ hạn mức (đã cộng p_chars), false nếu vượt p_cap.
create or replace function public.tts_reserve(p_chars integer, p_cap bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  m text := to_char(now() at time zone 'utc', 'YYYY-MM');
  ok boolean;
begin
  insert into public.tts_usage (month, chars) values (m, 0) on conflict (month) do nothing;
  update public.tts_usage
     set chars = chars + p_chars, updated_at = now()
   where month = m and chars + p_chars <= p_cap
  returning true into ok;
  return coalesce(ok, false);
end;
$$;

-- 5. Trả lại hạn mức khi nhà cung cấp báo lỗi (không bị tính tiền).
create or replace function public.tts_release(p_chars integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.tts_usage
     set chars = greatest(0, chars - p_chars), updated_at = now()
   where month = to_char(now() at time zone 'utc', 'YYYY-MM');
$$;

revoke all on function public.tts_reserve(integer, bigint) from public, anon, authenticated;
revoke all on function public.tts_release(integer) from public, anon, authenticated;
grant execute on function public.tts_reserve(integer, bigint) to service_role;
grant execute on function public.tts_release(integer) to service_role;
