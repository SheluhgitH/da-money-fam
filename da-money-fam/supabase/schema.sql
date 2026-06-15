-- DMF Music Store Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL editor when connecting to a live project.

create extension if not exists "pgcrypto";

create table if not exists songs (
  id text primary key,
  title varchar(255) not null,
  artist varchar(255) not null default 'JackPot',
  album_cover_path text not null,
  mp3_file_path text not null,
  preview_path text,
  price numeric(10, 2) not null default 5.00,
  is_promoted boolean not null default false,
  for_sale boolean not null default true,
  genre varchar(100),
  release_date date,
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  song_id text not null references songs(id) on delete cascade,
  buyer_email varchar(255) not null,
  buyer_name varchar(255) not null,
  payment_proof text not null,
  payment_method varchar(100) not null default 'manual',
  status varchar(20) not null default 'pending'
    check (status in ('pending', 'verified', 'delivered', 'rejected')),
  download_token text,
  stripe_session_id text unique,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_settings (
  id int primary key default 1 check (id = 1),
  paypal_email varchar(255) not null default '',
  cashapp_tag varchar(100) not null default '',
  venmo_handle varchar(100) not null default '',
  contact_email varchar(255) not null default 'contact@damoneyfam.com',
  instructions text not null default ''
);

insert into payment_settings (id) values (1) on conflict (id) do nothing;

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists songs_updated_at on songs;
create trigger songs_updated_at
  before update on songs
  for each row execute function update_updated_at();

drop trigger if exists orders_updated_at on purchase_orders;
create trigger orders_updated_at
  before update on purchase_orders
  for each row execute function update_updated_at();

alter table songs enable row level security;
alter table purchase_orders enable row level security;
alter table payment_settings enable row level security;

create policy "Public can read published songs"
  on songs for select
  using (is_published = true);

create policy "Anyone can create orders"
  on purchase_orders for insert
  with check (true);

create policy "Public can read payment settings"
  on payment_settings for select
  using (true);

-- ---------------------------------------------------------------------------
-- Fan accounts & personalization
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp numeric not null default 0,
  level int not null default 1,
  streak int not null default 0,
  last_login date
);

create table if not exists user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table if not exists user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table purchase_orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_purchase_orders_user_song
  on purchase_orders (user_id, song_id);

alter table profiles enable row level security;
alter table user_stats enable row level security;
alter table user_favorites enable row level security;
alter table user_achievements enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can read own stats"
  on user_stats for select using (auth.uid() = user_id);

create policy "Users can update own stats"
  on user_stats for update using (auth.uid() = user_id);

create policy "Users can insert own stats"
  on user_stats for insert with check (auth.uid() = user_id);

create policy "Users can manage own favorites"
  on user_favorites for all using (auth.uid() = user_id);

create policy "Users can read own achievements"
  on user_achievements for select using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on user_achievements for insert with check (auth.uid() = user_id);

create policy "Users can read own orders"
  on purchase_orders for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists user_coins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  amount numeric not null default 0 check (amount >= 0)
);

alter table user_coins enable row level security;

create policy "Users can read own coins"
  on user_coins for select using (auth.uid() = user_id);

create policy "Users can update own coins"
  on user_coins for update using (auth.uid() = user_id);

create policy "Users can insert own coins"
  on user_coins for insert with check (auth.uid() = user_id);

-- Storage buckets (create in Supabase dashboard):
--   store-audio (private)
--   store-covers (public)
