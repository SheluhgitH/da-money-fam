-- DMF Blog (Simple Daily Blog)
-- Run once in Supabase SQL Editor.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  is_published boolean not null default false,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table blog_posts enable row level security;

drop policy if exists "Anyone can read published posts" on blog_posts;
create policy "Anyone can read published posts"
  on blog_posts for select using (is_published = true);

create index if not exists idx_blog_posts_published_at
  on blog_posts (published_at desc);

create index if not exists idx_blog_posts_slug
  on blog_posts (slug);
