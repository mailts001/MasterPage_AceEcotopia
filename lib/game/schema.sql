-- X68 Game Commerce Schema
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- RLS is enabled on every table. Adjust policies to match your auth setup.

-- ─── Merchants ───────────────────────────────────────────────────────────────

create table if not exists merchants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text,
  category      text not null default 'general',
  description   text,
  contact_email text not null,
  tier          text not null default 'basic' check (tier in ('basic','campaign','premium')),
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table merchants enable row level security;

create policy "merchants: admin full access"
  on merchants for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "merchants: read approved"
  on merchants for select
  using (approved = true);

-- ─── Products ────────────────────────────────────────────────────────────────

create table if not exists products (
  id           uuid primary key default gen_random_uuid(),
  merchant_id  uuid not null references merchants(id) on delete cascade,
  name         text not null,
  image_url    text not null,
  price        numeric(10,2) not null,
  currency     text not null default 'SGD',
  category     text not null default 'general',
  description  text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table products enable row level security;

create policy "products: admin full access"
  on products for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "products: read active"
  on products for select
  using (active = true);

-- ─── Coupons ─────────────────────────────────────────────────────────────────

create table if not exists coupons (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  reward_type    text not null check (reward_type in ('coupon_fixed','coupon_pct','points','merchandise')),
  value          numeric(10,2) not null,       -- dollar or percentage
  code           text,                         -- null = ID-based redemption
  inventory      int not null default 100,
  redeemed_count int not null default 0,
  daily_cap      int,
  expires_at     timestamptz,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table coupons enable row level security;

create policy "coupons: admin full access"
  on coupons for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "coupons: read active with inventory"
  on coupons for select
  using (active = true and redeemed_count < inventory);

-- ─── Campaigns ───────────────────────────────────────────────────────────────

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name        text not null,
  objective   text not null check (objective in ('sales','awareness','redemption','footfall','leads')),
  budget      numeric(10,2) not null default 0,
  daily_cap   numeric(10,2) not null default 0,
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'draft' check (status in ('draft','live','paused','ended')),
  created_at  timestamptz not null default now()
);

alter table campaigns enable row level security;

create policy "campaigns: admin full access"
  on campaigns for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "campaigns: read live"
  on campaigns for select
  using (status = 'live' and start_date <= current_date and end_date >= current_date);

-- ─── Campaign placements (product ↔ game slot) ───────────────────────────────

create table if not exists campaign_placements (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  district_id  text not null,   -- 'ecommerce' | 'financial' | etc
  game_id      text not null,   -- 'deal_hunt' | 'market_pulse' | etc
  game_role    text not null check (game_role in ('target','reward','decoy','collectible','mystery')),
  priority     int not null default 5,
  product_id   uuid not null references products(id),
  coupon_id    uuid not null references coupons(id),
  created_at   timestamptz not null default now()
);

alter table campaign_placements enable row level security;

create policy "placements: admin full access"
  on campaign_placements for all
  using (auth.jwt() ->> 'role' = 'admin');

create policy "placements: read via live campaign"
  on campaign_placements for select
  using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_id
        and c.status = 'live'
        and c.start_date <= current_date
        and c.end_date >= current_date
    )
  );

-- ─── Game sessions ───────────────────────────────────────────────────────────

create table if not exists game_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  district_id text not null,
  game_id     text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  score       int not null default 0,
  xp_earned   int not null default 0,
  completed   boolean not null default false
);

alter table game_sessions enable row level security;

create policy "sessions: owner read/write"
  on game_sessions for all
  using (auth.uid() = user_id);

create policy "sessions: admin read"
  on game_sessions for select
  using (auth.jwt() ->> 'role' = 'admin');

-- ─── Reward unlocks ──────────────────────────────────────────────────────────

create table if not exists reward_unlocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid not null references game_sessions(id) on delete cascade,
  coupon_id    uuid not null references coupons(id),
  unlocked_at  timestamptz not null default now(),
  redeemed_at  timestamptz
);

alter table reward_unlocks enable row level security;

create policy "unlocks: owner full access"
  on reward_unlocks for all
  using (auth.uid() = user_id);

create policy "unlocks: admin read"
  on reward_unlocks for select
  using (auth.jwt() ->> 'role' = 'admin');

-- ─── Citizen wallet (XP + credits) ──────────────────────────────────────────

create table if not exists citizen_wallet (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  xp_total     int not null default 0,
  xp_this_week int not null default 0,
  credits      int not null default 0,
  updated_at   timestamptz not null default now()
);

alter table citizen_wallet enable row level security;

create policy "wallet: owner full access"
  on citizen_wallet for all
  using (auth.uid() = user_id);

create policy "wallet: admin read"
  on citizen_wallet for select
  using (auth.jwt() ->> 'role' = 'admin');

-- ─── Helper: increment coupon redeemed_count atomically ──────────────────────

create or replace function claim_coupon(p_coupon_id uuid, p_user_id uuid, p_session_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_unlock_id uuid;
begin
  -- Decrement inventory (fails if count >= inventory)
  update coupons
  set redeemed_count = redeemed_count + 1
  where id = p_coupon_id
    and redeemed_count < inventory
    and active = true
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'coupon_unavailable';
  end if;

  -- Record the unlock
  insert into reward_unlocks (user_id, session_id, coupon_id)
  values (p_user_id, p_session_id, p_coupon_id)
  returning id into v_unlock_id;

  return v_unlock_id;
end;
$$;
