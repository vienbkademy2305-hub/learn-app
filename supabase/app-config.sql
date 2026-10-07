-- Small public key/value settings read by the static site (docs/OPENPRONOUNCE_PLAN.md):
-- pronounce_url = current https address of the OpenPronounce tunnel on the learner's computer.
-- Anyone may read; only the service role (secret key) writes.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists "app_config read" on public.app_config;
create policy "app_config read" on public.app_config for select to anon, authenticated using (true);
grant select on public.app_config to anon, authenticated;
