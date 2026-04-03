-- Scope payout adjustments (advance, etc.) to the half-month tab they were entered in.
-- Run in Supabase SQL editor if migrations are not applied automatically.

alter table public.earnings add column if not exists payout_period_key text;

create unique index if not exists earnings_user_payout_period_key_uidx
  on public.earnings (user_id, payout_period_key)
  where payout_period_key is not null;

-- Optional: attach existing rows (null key) to a specific tab, e.g. Mar 16–end 2026:
-- update public.earnings set payout_period_key = '2026-3-second'
-- where payout_period_key is null and coalesce(advance, 0) > 0;
