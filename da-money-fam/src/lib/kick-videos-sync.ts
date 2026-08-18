import { VERIFIED_KICK_VIDEOS } from '@/data/kick-videos'
import { createServiceClient } from '@/lib/supabase/server'
import { KICK_CHANNEL_SLUG, buildKickWatchUrl, type KickVideo } from '@/lib/streams'

const FETCH_TIMEOUT_MS = 12000
const VIDEO_LIMIT = 12
const CACHE_STALE_MS = 24 * 60 * 60 * 1000

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

type StreamVideoRow = {
  id: string
  vod_id: string
  title: string
  category: string
  thumbnail: string
  duration_ms: number
  views: number
  kick_created_at: string
  watch_url: string
  synced_at: string
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
      FETCH_TIMEOUT_MS
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

async function fetchKickListOnce(): Promise<KickApiVideo[] | null> {
  const res = await fetchWithTimeout(
    `https://kick.com/api/v2/channels/${KICK_CHANNEL_SLUG}/videos`,
    { headers: KICK_HEADERS, cache: 'no-store' },
    FETCH_TIMEOUT_MS
  )

  if (!res.ok) {
    console.error(`Kick videos API returned ${res.status} ${res.statusText}`)
    return null
  }

  const data = (await res.json()) as KickApiVideo[]
  return Array.isArray(data) ? data : []
}

export async function fetchKickVideosFromApi(): Promise<KickVideo[]> {
  try {
    let list = await fetchKickListOnce()
    if (list === null) {
      list = await fetchKickListOnce()
    }
    if (list === null) {
      return []
    }

    const videos = await mapKickVideos(list)
    if (videos.length === 0) {
      console.error('Kick videos API returned no playable videos with valid vod_id')
    }

    return sortVideosNewestFirst(videos)
  } catch (error) {
    console.error('Kick videos fetch error:', error)
    return []
  }
}

function videoToRow(video: KickVideo): Omit<StreamVideoRow, 'synced_at'> {
  return {
    id: video.id,
    vod_id: video.vodId || '',
    title: video.title,
    category: video.category,
    thumbnail: video.thumbnail,
    duration_ms: video.durationMs,
    views: video.views,
    kick_created_at: video.createdAt,
    watch_url: video.watchUrl,
  }
}

function rowToVideo(row: StreamVideoRow): KickVideo {
  return {
    id: row.id,
    vodId: row.vod_id,
    title: row.title,
    category: row.category,
    thumbnail: row.thumbnail,
    durationMs: Number(row.duration_ms) || 0,
    views: Number(row.views) || 0,
    createdAt: row.kick_created_at,
    watchUrl: row.watch_url,
  }
}

export async function loadCachedStreamVideos(): Promise<{
  videos: KickVideo[]
  lastSyncedAt: string | null
  stale: boolean
}> {
  const supabase = createServiceClient()
  if (!supabase) {
    return { videos: [], lastSyncedAt: null, stale: true }
  }

  const { data, error } = await supabase
    .from('stream_videos')
    .select('*')
    .order('kick_created_at', { ascending: false })
    .limit(VIDEO_LIMIT)

  if (error || !data?.length) {
    if (error) console.error('stream_videos cache read error:', error)
    return { videos: [], lastSyncedAt: null, stale: true }
  }

  const rows = data as StreamVideoRow[]
  const lastSyncedAt = rows.reduce((latest, row) => {
    if (!latest || row.synced_at > latest) return row.synced_at
    return latest
  }, rows[0]?.synced_at ?? null)

  const syncedMs = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0
  const stale = !syncedMs || Date.now() - syncedMs > CACHE_STALE_MS

  return {
    videos: sortVideosNewestFirst(rows.map(rowToVideo)),
    lastSyncedAt,
    stale,
  }
}

export async function upsertStreamVideos(videos: KickVideo[]): Promise<number> {
  if (videos.length === 0) return 0

  const supabase = createServiceClient()
  if (!supabase) return 0

  const now = new Date().toISOString()
  const rows = videos.map((video) => ({
    ...videoToRow(video),
    synced_at: now,
  }))

  const { error } = await supabase.from('stream_videos').upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('stream_videos upsert error:', error)
    return 0
  }

  return rows.length
}

export async function syncKickVideosToSupabase(): Promise<{
  synced: number
  total: number
  lastSyncedAt: string | null
  errors: string[]
}> {
  const errors: string[] = []
  const videos = await fetchKickVideosFromApi()

  if (videos.length === 0) {
    errors.push('Kick API returned no playable videos')
    const cached = await loadCachedStreamVideos()
    if (cached.videos.length > 0) {
      return {
        synced: 0,
        total: cached.videos.length,
        lastSyncedAt: cached.lastSyncedAt,
        errors,
      }
    }

    const fallbackSynced = await upsertStreamVideos(VERIFIED_KICK_VIDEOS)
    return {
      synced: fallbackSynced,
      total: VERIFIED_KICK_VIDEOS.length,
      lastSyncedAt: fallbackSynced > 0 ? new Date().toISOString() : null,
      errors,
    }
  }

  const synced = await upsertStreamVideos(videos)
  if (synced === 0) {
    errors.push('Failed to upsert stream_videos')
  }

  return {
    synced,
    total: videos.length,
    lastSyncedAt: synced > 0 ? new Date().toISOString() : null,
    errors,
  }
}

export async function getStreamVideosForApi(): Promise<KickVideo[]> {
  const cached = await loadCachedStreamVideos()
  if (cached.videos.length > 0 && !cached.stale) {
    return cached.videos
  }

  const live = await fetchKickVideosFromApi()
  if (live.length > 0) {
    await upsertStreamVideos(live)
    return live
  }

  if (cached.videos.length > 0) {
    return cached.videos
  }

  return VERIFIED_KICK_VIDEOS
}
