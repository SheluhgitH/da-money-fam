-- Admin Phase 1: site settings, audit log, Ad Studio admin columns
-- Run in Supabase SQL editor.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on site_settings;
create policy "Anyone can read site settings"
  on site_settings for select using (true);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table admin_audit_log enable row level security;

alter table ad_studio_generations
  add column if not exists admin_notes text;

alter table ad_studio_generations
  add column if not exists refunded_at timestamptz;

alter table ad_studio_generations
  add column if not exists refund_coinz int not null default 0;

alter table ad_studio_generations
  add column if not exists admin_hidden boolean not null default false;

insert into site_settings (key, value) values
  ('ad_studio.pricing', '{"liteBaseCoins":10,"fastBaseCoins":20,"fanClubDiscountPercent":15,"durations":[6,8,10]}'::jsonb),
  ('ad_studio.packs', '{"starter":{"amount":50,"price":8,"label":"Starter"},"creator":{"amount":150,"price":20,"label":"Creator"},"studio":{"amount":400,"price":50,"label":"Studio"}}'::jsonb),
  ('homepage.hero', '{"kicker":"Luxury Hip-Hop Collective","headline":"DA MONEY FAM","tagline":"Setting trends in music, fashion, and culture since day one","primaryCta":"Listen Now","secondaryCta":"Shop The Drop"}'::jsonb),
  ('homepage.about', '{"imageUrl":"/images/collective/collective-14.jpg"}'::jsonb),
  ('streams.hidden_ids', '["c05b9610-4207-4177-af57-1fd30b7cfc7b"]'::jsonb)
on conflict (key) do nothing;
