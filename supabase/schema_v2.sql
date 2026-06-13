-- X68 Schema v2 — run this in Supabase SQL Editor AFTER schema.sql
-- Adds: api_keys table

-- ============================================================
-- API Keys
-- ============================================================
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  citizen_id   uuid not null references public.citizens(id) on delete cascade,
  key_hash     text not null,          -- base64 of full key (swap for bcrypt in prod)
  key_prefix   text not null,          -- e.g. "x68_a1b2c3d4…" shown in UI
  tier         text not null default 'explorer'
                 check (tier in ('explorer','citizen','enterprise')),
  revoked      boolean not null default false,
  calls_today  integer not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.api_keys enable row level security;

-- Citizens can read their own keys, server manages writes
create policy "keys: own read" on public.api_keys for select
  using (auth.uid() = citizen_id);

create index if not exists idx_api_keys_citizen on public.api_keys(citizen_id);
create index if not exists idx_api_keys_hash    on public.api_keys(key_hash);

-- Reset calls_today daily (call via cron or pg_cron extension)
-- select cron.schedule('reset-api-calls', '0 0 * * *', $$
--   update public.api_keys set calls_today = 0 where not revoked;
-- $$);
