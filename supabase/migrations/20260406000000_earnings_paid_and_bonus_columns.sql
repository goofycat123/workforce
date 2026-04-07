-- Add paid flag and split bonus columns to earnings table
-- Run in Supabase SQL editor

alter table public.earnings add column if not exists paid boolean default false;
alter table public.earnings add column if not exists vence_bonus numeric(10,2) default 0;
alter table public.earnings add column if not exists owner_bonus numeric(10,2) default 0;
