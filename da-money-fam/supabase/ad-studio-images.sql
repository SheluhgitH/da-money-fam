-- Ad Studio image generations + storage notes
-- Create bucket `ad-studio-refs` in Supabase Storage (public read) if not auto-created by API

create table if not exists public.ad_studio_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text,
  model text not null,
  mode text not null check (mode in ('generate', 'edit')),
  aspect_ratio text default '9:16',
  input_ref_urls text[] default '{}',
  output_url text not null,
  coinz_spent int not null default 0,
  usd_cost numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_studio_images_user_created
  on public.ad_studio_images (user_id, created_at desc);

alter table public.ad_studio_images enable row level security;

drop policy if exists "Users read own ad studio images" on public.ad_studio_images;
create policy "Users read own ad studio images"
  on public.ad_studio_images for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own ad studio images" on public.ad_studio_images;
create policy "Users insert own ad studio images"
  on public.ad_studio_images for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own ad studio images" on public.ad_studio_images;
create policy "Users delete own ad studio images"
  on public.ad_studio_images for delete
  using (auth.uid() = user_id);
