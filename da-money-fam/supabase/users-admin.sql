-- Manage Users + Coinz ledger + Fan Club manual override

alter table public.profiles
  add column if not exists email text,
  add column if not exists fan_club_manual boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists avatar_url text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, split_part(new.email, '@', 1), new.email)
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);
  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create table if not exists public.coinz_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  balance_after int not null,
  reason text not null,
  reference_id text,
  admin_note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_coinz_ledger_user_created
  on public.coinz_ledger (user_id, created_at desc);

alter table public.coinz_ledger enable row level security;

drop policy if exists "Users can read own coinz ledger" on public.coinz_ledger;
create policy "Users can read own coinz ledger"
  on public.coinz_ledger for select using (auth.uid() = user_id);

-- Ad Studio saved looks / templates
create table if not exists public.ad_studio_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brief text,
  creative jsonb,
  aspect_ratio text default '9:16',
  model text,
  duration_seconds int default 6,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ad_studio_presets_user
  on public.ad_studio_presets (user_id, updated_at desc);

alter table public.ad_studio_presets enable row level security;

drop policy if exists "Users manage own presets" on public.ad_studio_presets;
create policy "Users manage own presets"
  on public.ad_studio_presets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
