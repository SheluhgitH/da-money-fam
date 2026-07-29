import { NextResponse } from 'next/server'
import { VERIFIED_KICK_VIDEOS } from '@/data/kick-videos'
import { KICK_CHANNEL_SLUG, buildKickWatchUrl, type KickVideo } from '@/lib/streams'

export const dynamic = 'force-dynamic'

const DETAIL_FETCH_TIMEOUT_MS = 5000

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
  livestream?: { vod_id?: string }
}

const KICK_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `https://kick.com/${KICK_CHANNEL_SLUG}/videos`,
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const verifiedById = new Map(VERIFIED_KICK_VIDEOS.map((video) => [video.id, video]))

function sortVideosNewestFirst(videos: KickVideo[]): KickVideo[] {
  return [...videos].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function mergeWithVerifiedFallbacks(videos: KickVideo[]): KickVideo[] {
  const merged = new Map<string, KickVideo>()

  for (const video of VERIFIED_KICK_VIDEOS) {
    merged.set(video.id, video)
  }

  for (const video of videos) {
    merged.set(video.id, video)
  }

  return sortVideosNewestFirst(Array.from(merged.values()))
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchVideoDetail(uuid: string): Promise<KickVideoDetail | null> {
  try {
    const res = await fetchWithTimeout(
      `https://kick.com/api/v1/video/${uuid}`,
      { headers: KICK_HEADERS, cache: 'no-store' },
      DETAIL_FETCH_TIMEOUT_MS
    )
    if (!res.ok) return null
    return (await res.json()) as KickVideoDetail
  } catch (error) {
    console.error(`Kick video detail fetch error for ${uuid}:`, error)
    return null
  }
}

function resolveVodId(detail: KickVideoDetail | null): string | null {
  if (!detail) return null
  return detail.vod_id || detail.livestream?.vod_id || null
}

function buildVideo(item: KickApiVideo, vodId: string): KickVideo {
  const uuid = item.video?.uuid
  if (!uuid) {
    throw new Error('Missing video uuid')
  }

  return {
    id: String(uuid),
    vodId,
    title: item.session_title || 'Stream',
    category: item.categories?.[0]?.name || 'IRL',
    thumbnail: item.thumbnail?.src || '',
    durationMs: Number(item.duration) || 0,
    views: Number(item.views) || 0,
    createdAt: item.created_at,
    watchUrl: buildKickWatchUrl(vodId),
  }
}

async function mapKickVideos(data: KickApiVideo[]): Promise<KickVideo[]> {
  const results = await Promise.allSettled(
    data.map(async (item) => {
      const uuid = item.video?.uuid
      if (!uuid) return null

      const detail = await fetchVideoDetail(uuid)
      const vodId = resolveVodId(detail)
      if (vodId) {
        return buildVideo(item, vodId)
      }

      const verified = verifiedById.get(uuid)
      if (verified?.vodId) {
        return {
          ...buildVideo(item, verified.vodId),
          watchUrl: verified.watchUrl,
        }
      }

      console.warn(`Kick video ${uuid} missing vod_id and no verified fallback — omitted`)
      return null
    })
  )

  return results
    .filter((result): result is PromiseFulfilledResult<KickVideo | null> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((video): video is KickVideo => Boolean(video))
}

async function fetchKickVideos(): Promise<KickVideo[]> {
  try {
    const res = await fetchWithTimeout(
      `https://kick.com/api/v2/channels/${KICK_CHANNEL_SLUG}/videos`,
      { headers: KICK_HEADERS, cache: 'no-store' },
      DETAIL_FETCH_TIMEOUT_MS
    )

    if (!res.ok) {
      console.error(`Kick videos API returned ${res.status} ${res.statusText}`)
      return VERIFIED_KICK_VIDEOS
    }

    const data = (await res.json()) as KickApiVideo[]
    const videos = await mapKickVideos(Array.isArray(data) ? data : [])
    if (videos.length === 0) {
      console.error('Kick videos API returned no playable videos with valid vod_id')
    }

    return mergeWithVerifiedFallbacks(videos)
  } catch (error) {
    console.error('Kick videos fetch error:', error)
    return VERIFIED_KICK_VIDEOS
  }
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
    console.error('Kick videos route error:', error)
    return NextResponse.json({ videos: VERIFIED_KICK_VIDEOS, channel: KICK_CHANNEL_SLUG }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
