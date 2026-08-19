import { buildKickWatchUrl, type KickVideo } from '@/lib/streams'

/**
 * Manually verified Kick VODs used when the Kick API is blocked or vod_id lookup fails.
 * After each new stream: copy vod_id from kick.com/jackpotwrld/videos/{vod_id}
 * (NOT the session slug).
 */
export const HIDDEN_STREAM_VIDEO_IDS = new Set([
  'c05b9610-4207-4177-af57-1fd30b7cfc7b', // DMF COOKOUT
])
export const VERIFIED_KICK_VIDEOS: KickVideo[] = [
  {
    id: '1c2e3ac4-097c-4206-a33f-442b6f8f0078',
    vodId: '01a01259-6a88-7313-a805-ac9bbac248b3',
    title: 'DM Smoke sesh',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/tiqeR3OcvwVT/720.webp',
    durationMs: 2087000,
    views: 35,
    createdAt: '2026-08-18 00:50:49',
    watchUrl: buildKickWatchUrl('01a01259-6a88-7313-a805-ac9bbac248b3'),
  },
  {
    id: '38a98b83-d61e-408d-bfa7-efe0e9f7fc41',
    vodId: '019ff859-4db0-7621-92c0-1921469f914f',
    title: 'DMF MUKBANG',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/UH4EqLlVBOlY/720.webp',
    durationMs: 1783000,
    views: 30,
    createdAt: '2026-08-12 23:40:32',
    watchUrl: buildKickWatchUrl('019ff859-4db0-7621-92c0-1921469f914f'),
  },
  {
    id: 'efe0c840-0141-44b2-97ce-79dfbf1b4e98',
    vodId: '019ff78d-9558-7ea5-909f-1728cfe21bd0',
    title: 'Day with DMF (Gym Day)',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/nGo7g3JxIoad/720.webp',
    durationMs: 2837000,
    views: 43,
    createdAt: '2026-08-12 19:58:02',
    watchUrl: buildKickWatchUrl('019ff78d-9558-7ea5-909f-1728cfe21bd0'),
  },
]
