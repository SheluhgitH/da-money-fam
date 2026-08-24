-- Private Ad Studio character library

create table if not exists public.ad_studio_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  style_id text not null default 'photoreal',
  prompt text,
  sheet_urls text[] not null default '{}',
  ref_urls text[] not null default '{}',
  primary_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ad_studio_characters_user_updated
  on public.ad_studio_characters (user_id, updated_at desc);

alter table public.ad_studio_characters enable row level security;

drop policy if exists "Users read own ad studio characters" on public.ad_studio_characters;
create policy "Users read own ad studio characters"
  on public.ad_studio_characters for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own ad studio characters" on public.ad_studio_characters;
create policy "Users insert own ad studio characters"
  on public.ad_studio_characters for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own ad studio characters" on public.ad_studio_characters;
create policy "Users update own ad studio characters"
  on public.ad_studio_characters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own ad studio characters" on public.ad_studio_characters;
create policy "Users delete own ad studio characters"
  on public.ad_studio_characters for delete
  using (auth.uid() = user_id);
