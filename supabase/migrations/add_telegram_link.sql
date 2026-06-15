-- Migration: add telegram linking to citizens
-- Run in Supabase SQL Editor

-- 1. Add telegram_chat_id to citizens table
alter table citizens
  add column if not exists telegram_chat_id text default null;

-- 2. Create link_codes table — temporary codes citizens use to connect Telegram
create table if not exists telegram_link_codes (
  code        text primary key,               -- 6-char uppercase code e.g. "X7K2MN"
  citizen_id  uuid not null references citizens(id) on delete cascade,
  created_at  timestamptz default now(),
  expires_at  timestamptz default (now() + interval '15 minutes'),
  used        boolean default false
);

-- 3. Only the citizen can see their own code
alter table telegram_link_codes enable row level security;

create policy "citizen own codes"
  on telegram_link_codes for select
  using (auth.uid() = citizen_id);

create policy "citizen insert own code"
  on telegram_link_codes for insert
  with check (auth.uid() = citizen_id);

-- 4. Service role can read/update codes (for the bot to verify)
-- Service role bypasses RLS automatically — no extra policy needed.

-- Done. Two new objects: citizens.telegram_chat_id + telegram_link_codes table.
