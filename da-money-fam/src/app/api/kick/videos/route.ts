import { NextResponse } from 'next/server'
import { KICK_CHANNEL_SLUG, type KickVideo } from '@/lib/streams'

export const dynamic = 'force-dynamic'
export const revalidate = 300

type KickApiVideo = {
  session_title: string
  duration: number
  views: number
  created_at: string
  thumbnail?: { src?: string }
  categories?: Array<{ name?: string }>
  video?: { uuid?: string }
}

const FALLBACK_VIDEOS: KickVideo[] = [
  {
    id: '6a5a1470-e45a-433e-8253-55c02428dca1',
    title: 'Day with DMF',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/9pQmFY133DtH/720.webp',
    durationMs: 3667000,
    views: 15,
    createdAt: '2026-07-09 02:02:23',
    watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/6a5a1470-e45a-433e-8253-55c02428dca1`,
  },
  {
    id: '65b8323e-b16f-4ec5-bda8-4c2ec9b66cfb',
    title: 'Day with DMF',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/k0ERjnaFsDRH/720.webp',
    durationMs: 542000,
    views: 20,
    createdAt: '2026-07-09 01:51:32',
    watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/65b8323e-b16f-4ec5-bda8-4c2ec9b66cfb`,
  },
]

function mapKickVideos(data: KickApiVideo[]): KickVideo[] {
  return data
    .filter((item) => item.video?.uuid)
    .map((item) => ({
      id: String(item.video!.uuid),
      title: item.session_title || 'Stream',
      category: item.categories?.[0]?.name || 'IRL',
      thumbnail: item.thumbnail?.src || '',
      durationMs: Number(item.duration) || 0,
      views: Number(item.views) || 0,
      createdAt: item.created_at,
      watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/${item.video!.uuid}`,
    }))
}

async function fetchKickVideos(): Promise<KickVideo[]> {
  const res = await fetch(`https://kick.com/api/v2/channels/${KICK_CHANNEL_SLUG}/videos`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: `https://kick.com/${KICK_CHANNEL_SLUG}/videos`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    cache: 'no-store',
  })

  if (!res.ok) return FALLBACK_VIDEOS

  const data = (await res.json()) as KickApiVideo[]
  const videos = mapKickVideos(Array.isArray(data) ? data : [])
  return videos.length > 0 ? videos : FALLBACK_VIDEOS
}

export async function GET() {
  try {
    const videos = await fetchKickVideos()
    return NextResponse.json({ videos, channel: KICK_CHANNEL_SLUG })
  } catch (error) {
    console.error('Kick videos fetch error:', error)
    return NextResponse.json({ videos: FALLBACK_VIDEOS, channel: KICK_CHANNEL_SLUG })
  }
}
