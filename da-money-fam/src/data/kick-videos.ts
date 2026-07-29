import { buildKickWatchUrl, type KickVideo } from '@/lib/streams'

/**
 * Manually verified Kick VODs used when the Kick API is blocked or vod_id lookup fails.
 * After each new stream: copy vod_id from kick.com/jackpotwrld/videos/{vod_id}
 * (NOT the session slug).
 */
export const VERIFIED_KICK_VIDEOS: KickVideo[] = [
  {
    id: 'c05b9610-4207-4177-af57-1fd30b7cfc7b',
    vodId: '019f9fd2-a128-7b26-bca4-96ed3e7ea297',
    title: 'DMF COOKOUT',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/FNia5aNbf8aS/720.webp',
    durationMs: 6699000,
    views: 8,
    createdAt: '2026-07-26 19:06:53',
    watchUrl: buildKickWatchUrl('019f9fd2-a128-7b26-bca4-96ed3e7ea297'),
  },
]
