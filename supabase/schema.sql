-- AceEcotopia Master Platform — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run All
-- Paste the ENTIRE file at once.

-- ============================================================
-- 1. Citizens (extends Supabase auth.users)
-- ============================================================
create table if not exists public.citizens (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  tier          text not null default 'explorer'   -- explorer | citizen | enterprise
                  check (tier in ('explorer','citizen','enterprise')),
  nexus_credits integer not null default 0,
  referral_code text unique,
  referred_by   uuid references public.citizens(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create citizen row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.citizens (id, display_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    upper(substring(md5(new.id::text) from 1 for 8))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Saved Assets (property/stock/deal watchlists)
-- ============================================================
create table if not exists public.saved_assets (
  id          uuid primary key default gen_random_uuid(),
  citizen_id  uuid not null references public.citizens(id) on delete cascade,
  district    text not null   -- propos | aceeconomy | nexustravel | commerce
                check (district in ('propos','aceeconomy','nexustravel','commerce')),
  asset_id    text not null,  -- district-specific identifier
  asset_meta  jsonb,          -- snapshot: name, price, district-specific fields
  notes       text,
  created_at  timestamptz not null default now(),
  unique (citizen_id, district, asset_id)
);

-- ============================================================
-- 3. Nexus Credits ledger
-- ============================================================
create table if not exists public.credits_ledger (
  id          bigserial primary key,
  citizen_id  uuid not null references public.citizens(id) on delete cascade,
  delta       integer not null,           -- positive = earn, negative = spend
  reason      text not null,              -- 'referral' | 'alert_action' | 'subscription_redeem'
  ref_id      text,                       -- optional external reference
  created_at  timestamptz not null default now()
);

-- Auto-update citizen.nexus_credits when ledger changes
create or replace function public.sync_citizen_credits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.citizens
  set nexus_credits = nexus_credits + new.delta,
      updated_at = now()
  where id = new.citizen_id;
  return new;
end;
$$;

drop trigger if exists on_credits_ledger_insert on public.credits_ledger;
create trigger on_credits_ledger_insert
  after insert on public.credits_ledger
  for each row execute procedure public.sync_citizen_credits();

-- ============================================================
-- 4. Alert Subscriptions
-- ============================================================
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  citizen_id      uuid not null references public.citizens(id) on delete cascade,
  stripe_sub_id   text unique,             -- Stripe subscription ID
  plan            text not null default 'explorer'
                    check (plan in ('explorer','citizen','enterprise')),
  status          text not null default 'active'
                    check (status in ('active','past_due','cancelled','trialing')),
  current_period_end timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 5. Alert Events log
-- ============================================================
create table if not exists public.alert_events (
  id          bigserial primary key,
  citizen_id  uuid references public.citizens(id) on delete set null,
  district    text,
  alert_type  text,                         -- 'price_drop' | 'signal' | 'deal' etc.
  payload     jsonb,
  sent_at     timestamptz not null default now()
);

-- ============================================================
-- 6. AI Model Config (admin panel settings)
-- ============================================================
create table if not exists public.ai_config (
  id          integer primary key default 1    -- single-row settings table
                check (id = 1),
  provider    text not null default 'gemini'
                check (provider in ('gemini','groq','claude-haiku','claude-sonnet','claude-opus')),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.citizens(id)
);

insert into public.ai_config (id, provider) values (1, 'gemini')
  on conflict (id) do nothing;

-- ============================================================
-- 7. Row-Level Security
-- ============================================================
alter table public.citizens        enable row level security;
alter table public.saved_assets    enable row level security;
alter table public.credits_ledger  enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.alert_events    enable row level security;
alter table public.ai_config       enable row level security;

-- Citizens can read/update their own row
create policy "citizens: self read"   on public.citizens for select using (auth.uid() = id);
create policy "citizens: self update" on public.citizens for update using (auth.uid() = id);

-- Saved assets — own rows only
create policy "assets: own rows" on public.saved_assets
  using (auth.uid() = citizen_id);
create policy "assets: own insert" on public.saved_assets for insert
  with check (auth.uid() = citizen_id);
create policy "assets: own delete" on public.saved_assets for delete
  using (auth.uid() = citizen_id);

-- Credits ledger — read own, server inserts only (service role bypasses RLS)
create policy "credits: own read" on public.credits_ledger for select
  using (auth.uid() = citizen_id);

-- Subscriptions — read own
create policy "subs: own read" on public.subscriptions for select
  using (auth.uid() = citizen_id);

-- Alert events — read own
create policy "alerts: own read" on public.alert_events for select
  using (auth.uid() = citizen_id);

-- AI config — anyone can read, only service role writes
create policy "ai_config: public read" on public.ai_config for select
  using (true);

-- ============================================================
-- 8. Indexes for common queries
-- ============================================================
create index if not exists idx_saved_assets_citizen   on public.saved_assets(citizen_id);
create index if not exists idx_credits_citizen        on public.credits_ledger(citizen_id);
create index if not exists idx_subs_citizen           on public.subscriptions(citizen_id);
create index if not exists idx_alerts_citizen         on public.alert_events(citizen_id);
create index if not exists idx_alerts_sent_at         on public.alert_events(sent_at desc);
