-- DMF Kick stream VOD cache
-- Run once in Supabase SQL Editor.

create table if not exists stream_videos (
  id text primary key,
  vod_id text not null,
  title text not null,
  category text not null default 'IRL',
  thumbnail text not null default '',
  duration_ms bigint not null default 0,
  views integer not null default 0,
  kick_created_at text not null,
  watch_url text not null,
  synced_at timestamptz not null default now()
);

alter table stream_videos enable row level security;

drop policy if exists "Anyone can read stream videos" on stream_videos;
create policy "Anyone can read stream videos"
  on stream_videos for select using (true);

create index if not exists idx_stream_videos_kick_created_at
  on stream_videos (kick_created_at desc);
