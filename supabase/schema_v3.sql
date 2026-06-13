-- X68 Schema v3 — run after schema_v2.sql
-- Adds stripe_customer_id to citizens + subscription monthly credits reason

alter table public.citizens
  add column if not exists stripe_customer_id text;

-- Allow subscription_monthly as a credits reason
-- (the check constraint needs updating if you added one — drop and recreate)
-- If you get a constraint error, skip this and the code handles it gracefully.

create index if not exists idx_citizens_stripe on public.citizens(stripe_customer_id);
