-- Sync profiles schema with app expectations (created_at, avatar_url)
-- Run in Supabase SQL editor or via apply_migration.

alter table public.profiles
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists avatar_url text;

-- Backfill join dates from auth.users (prefer auth created_at over the default now())
update public.profiles p
set created_at = u.created_at
from auth.users u
where p.id = u.id
  and u.created_at is not null;
