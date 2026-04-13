-- Allow manual chatter profiles without a Supabase auth account.
-- Drops the FK constraint that ties profiles.id to auth.users(id).
-- The on_auth_user_created trigger still fires for real signups (inserts remain valid).
-- Run in Supabase SQL editor.

alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Allow owner/manager to insert profiles directly (name-only chatters)
drop policy if exists "Owner can insert profiles" on public.profiles;
create policy "Owner can insert profiles"
  on public.profiles for insert with check (get_my_role() in ('owner','manager'));
