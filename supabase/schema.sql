-- ============================================================
-- WORKFORCE SCHEMA — paste this into Supabase SQL editor
-- ============================================================

-- PROFILES (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  email       text not null,
  role        text not null default 'chatter' check (role in ('owner','manager','chatter')),
  team        text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- PAYROLL PERIODS
create table public.payroll_periods (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  status      text default 'open' check (status in ('open','closed')),
  created_at  timestamptz default now()
);

-- SHIFTS (clock in / clock out)
create table public.shifts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  clock_in    timestamptz not null,
  clock_out   timestamptz,
  date        date not null,
  period_id   uuid references public.payroll_periods(id),
  created_at  timestamptz default now()
);

-- SALES ENTRIES
create table public.sales_entries (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  shift_id    uuid references public.shifts(id),
  period_id   uuid references public.payroll_periods(id),
  net_sales   numeric(10,2) not null default 0,
  earnings    numeric(10,2) generated always as (round(net_sales * 0.07, 2)) stored,
  note        text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- EARNINGS SUMMARY (per user per period — managed by owner)
create table public.earnings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  period_id   uuid references public.payroll_periods(id) on delete cascade,
  net_sales   numeric(10,2) default 0,
  earnings    numeric(10,2) default 0,
  bonus       numeric(10,2) default 0,
  penalty     numeric(10,2) default 0,
  advance     numeric(10,2) default 0,
  net_owed    numeric(10,2) generated always as (
                round(earnings + bonus - penalty - advance, 2)
              ) stored,
  notes       text,
  updated_at  timestamptz default now(),
  unique(user_id, period_id)
);

-- PAYOUT REQUESTS (early payout)
create table public.payout_requests (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  period_id   uuid references public.payroll_periods(id),
  percent     int not null check (percent in (10, 20, 30)),
  amount      numeric(10,2) not null,
  status      text default 'pending' check (status in ('pending','approved','denied')),
  note        text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.shifts          enable row level security;
alter table public.sales_entries   enable row level security;
alter table public.earnings        enable row level security;
alter table public.payout_requests enable row level security;

-- Helper: get current user role
create or replace function public.get_my_role()
returns text language sql security definer
as $$ select role from public.profiles where id = auth.uid() $$;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (id = auth.uid());
create policy "Owner/manager can view all profiles"
  on public.profiles for select using (get_my_role() in ('owner','manager'));
create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());
create policy "Owner can insert profiles"
  on public.profiles for insert with check (get_my_role() = 'owner');

-- SHIFTS policies
create policy "Users can view own shifts"
  on public.shifts for select using (user_id = auth.uid());
create policy "Owner/manager can view all shifts"
  on public.shifts for select using (get_my_role() in ('owner','manager'));
create policy "Users can insert own shifts"
  on public.shifts for insert with check (user_id = auth.uid());
create policy "Users can update own open shifts"
  on public.shifts for update using (user_id = auth.uid() and clock_out is null);

-- SALES policies
create policy "Users can view own sales"
  on public.sales_entries for select using (user_id = auth.uid());
create policy "Owner/manager can view all sales"
  on public.sales_entries for select using (get_my_role() in ('owner','manager'));
create policy "Users can insert own sales"
  on public.sales_entries for insert with check (user_id = auth.uid());
create policy "Owner can insert sales for anyone"
  on public.sales_entries for insert with check (get_my_role() = 'owner');

-- EARNINGS policies
create policy "Users can view own earnings"
  on public.earnings for select using (user_id = auth.uid());
create policy "Owner/manager can view all earnings"
  on public.earnings for select using (get_my_role() in ('owner','manager'));
create policy "Owner can manage earnings"
  on public.earnings for all using (get_my_role() = 'owner');

-- PAYROLL PERIODS policies
create policy "Anyone authenticated can view periods"
  on public.payroll_periods for select using (auth.uid() is not null);
create policy "Owner can manage periods"
  on public.payroll_periods for all using (get_my_role() = 'owner');

-- PAYOUT REQUESTS policies
create policy "Users can view own requests"
  on public.payout_requests for select using (user_id = auth.uid());
create policy "Owner can view all requests"
  on public.payout_requests for select using (get_my_role() = 'owner');
create policy "Users can insert own requests"
  on public.payout_requests for insert with check (user_id = auth.uid());
create policy "Owner can update requests"
  on public.payout_requests for update using (get_my_role() = 'owner');

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'chatter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
