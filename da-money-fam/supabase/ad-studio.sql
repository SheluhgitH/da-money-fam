-- Ad Studio generation library
-- Run in Supabase SQL editor

create table if not exists ad_studio_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'single' check (mode in ('single', 'storyboard')),
  brief text,
  scenes jsonb not null default '[]'::jsonb,
  creative jsonb,
  aspect_ratio text not null default '9:16',
  duration_seconds int not null default 6,
  video_urls text[] not null default '{}',
  thumbnail_url text,
  coinz_spent int not null default 0,
  status text not null default 'completed'
    check (status in ('pending', 'processing', 'completed', 'failed', 'partial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_studio_generations_user_created_idx
  on ad_studio_generations (user_id, created_at desc);

alter table ad_studio_generations enable row level security;

drop policy if exists "Users read own ad studio generations" on ad_studio_generations;
create policy "Users read own ad studio generations"
  on ad_studio_generations for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own ad studio generations" on ad_studio_generations;
create policy "Users insert own ad studio generations"
  on ad_studio_generations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own ad studio generations" on ad_studio_generations;
create policy "Users update own ad studio generations"
  on ad_studio_generations for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own ad studio generations" on ad_studio_generations;
create policy "Users delete own ad studio generations"
  on ad_studio_generations for delete
  using (auth.uid() = user_id);

drop trigger if exists ad_studio_generations_updated_at on ad_studio_generations;
create trigger ad_studio_generations_updated_at
  before update on ad_studio_generations
  for each row execute function update_updated_at();
