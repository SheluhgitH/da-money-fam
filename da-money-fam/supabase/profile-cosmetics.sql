-- Admin-giftable profile cosmetics (crown, glow, verified check)

create table if not exists public.user_profile_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_slug text not null,
  enabled boolean not null default true,
  revealed_at timestamptz,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  admin_note text,
  gift_message text,
  unique (user_id, cosmetic_slug)
);

create index if not exists idx_user_profile_cosmetics_user
  on public.user_profile_cosmetics (user_id);

create index if not exists idx_user_profile_cosmetics_enabled
  on public.user_profile_cosmetics (user_id, enabled)
  where enabled = true;

alter table public.user_profile_cosmetics enable row level security;

drop policy if exists "Users can read own cosmetics" on public.user_profile_cosmetics;
create policy "Users can read own cosmetics"
  on public.user_profile_cosmetics for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own cosmetics" on public.user_profile_cosmetics;
create policy "Users can update own cosmetics"
  on public.user_profile_cosmetics for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public can read enabled cosmetics for display names (comments / spotlights)
drop policy if exists "Anyone can read enabled cosmetics" on public.user_profile_cosmetics;
create policy "Anyone can read enabled cosmetics"
  on public.user_profile_cosmetics for select
  using (enabled = true);
