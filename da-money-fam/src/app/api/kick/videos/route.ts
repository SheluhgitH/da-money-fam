import { NextResponse } from 'next/server'
import { KICK_CHANNEL_SLUG, type KickVideo } from '@/lib/streams'

export const dynamic = 'force-dynamic'

type KickApiVideo = {
  id: number
  slug: string
  session_title: string
  duration: number
  views: number
  created_at: string
  thumbnail?: { src?: string }
  categories?: Array<{ name?: string }>
  video?: { uuid?: string }
}

type KickVideoDetail = {
  uuid?: string
  vod_id?: string
}

const KICK_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `https://kick.com/${KICK_CHANNEL_SLUG}/videos`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const FALLBACK_VIDEOS: KickVideo[] = [
  {
    id: 'eae34da0-8cc6-4d2f-8f8f-dd240dfb61aa',
    title: 'Day with DMF',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/DfCZuzx8rIQK/720.webp',
    durationMs: 3071000,
    views: 36,
    createdAt: '2026-07-21 17:48:39',
    watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/019f85cb-3538-7db8-8eb1-5df3ad3b2bad`,
  },
  {
    id: '862bd851-b105-4ea6-9576-557bed930577',
    title: 'Day with DMF',
    category: 'IRL',
    thumbnail: 'https://images.kick.com/video_thumbnails/LnWNMK7XnYM0/RW17H5Ci60Du/720.webp',
    durationMs: 927000,
    views: 14,
    createdAt: '2026-07-21 14:35:19',
    watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/019f851a-34b8-775c-96ab-57d91622e5fe`,
  },
]

async function fetchVideoDetail(uuid: string): Promise<KickVideoDetail | null> {
  try {
    const res = await fetch(`https://kick.com/api/v1/video/${uuid}`, {
      headers: KICK_HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as KickVideoDetail
    return data
  } catch (error) {
    console.error(`Kick video detail fetch error for ${uuid}:`, error)
    return null
  }
}

function buildVideo(
  item: KickApiVideo,
  vodId: string | undefined
): KickVideo | null {
  const uuid = item.video?.uuid
  if (!uuid) return null

  const urlId = vodId || uuid
  return {
    id: String(uuid),
    title: item.session_title || 'Stream',
    category: item.categories?.[0]?.name || 'IRL',
    thumbnail: item.thumbnail?.src || '',
    durationMs: Number(item.duration) || 0,
    views: Number(item.views) || 0,
    createdAt: item.created_at,
    watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}/videos/${urlId}`,
  }
}

async function mapKickVideos(data: KickApiVideo[]): Promise<KickVideo[]> {
  const enriched = await Promise.all(
    data.map(async (item) => {
      const uuid = item.video?.uuid
      if (!uuid) return null
      const detail = await fetchVideoDetail(uuid)
      return buildVideo(item, detail?.vod_id)
    })
  )

  return enriched
    .filter((video): video is KickVideo => Boolean(video))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function fetchKickVideos(): Promise<KickVideo[]> {
  const res = await fetch(`https://kick.com/api/v2/channels/${KICK_CHANNEL_SLUG}/videos`, {
    headers: KICK_HEADERS,
    cache: 'no-store',
  })

  if (!res.ok) return FALLBACK_VIDEOS

  const data = (await res.json()) as KickApiVideo[]
  const videos = await mapKickVideos(Array.isArray(data) ? data : [])
  return videos.length > 0 ? videos : FALLBACK_VIDEOS
}

export async function GET() {
  try {
    const videos = await fetchKickVideos()
    return NextResponse.json({ videos, channel: KICK_CHANNEL_SLUG }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Kick videos fetch error:', error)
    return NextResponse.json({ videos: FALLBACK_VIDEOS, channel: KICK_CHANNEL_SLUG }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
