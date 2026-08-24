import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import {
  ensureDurableVideoWithPoster,
  ensurePosterForDurableVideo,
  isDurableVideoUrl,
  isImagePosterUrl,
} from '@/lib/ad-studio-video-storage'
import { writeAdminAudit } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Migrate completed generations that still use /api/video/{jobId}/content
 * into durable Supabase Storage public URLs, and generate JPEG posters.
 */
export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Math.min(Number(body.limit || 20), 50)
  const featuredOnly = body.featuredOnly !== false

  let query = supabase
    .from('ad_studio_generations')
    .select('id, user_id, video_urls, thumbnail_url, featured, status, scenes')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit * 3)

  if (featuredOnly) query = query.eq('featured', true)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const candidates = (data || [])
    .filter((row) => {
      const urls = Array.isArray(row.video_urls) ? row.video_urls : []
      const needsPersist = urls.some(
        (u: string) => !isDurableVideoUrl(u) && extractOpenRouterJobId(u)
      )
      const needsPoster = !isImagePosterUrl(row.thumbnail_url)
      return needsPersist || needsPoster
    })
    .slice(0, limit)

  const results: Array<{
    id: string
    ok: boolean
    url?: string
    poster?: string | null
    error?: string
  }> = []

  for (const row of candidates) {
    const urls: string[] = Array.isArray(row.video_urls) ? [...row.video_urls] : []
    const nextUrls: string[] = []
    let ok = true
    let lastError = ''
    let firstDurable: string | null = null
    let posterUrl: string | null = isImagePosterUrl(row.thumbnail_url)
      ? String(row.thumbnail_url)
      : null

    for (const url of urls) {
      if (isDurableVideoUrl(url)) {
        nextUrls.push(url)
        if (!firstDurable) firstDurable = url
        continue
      }
      const jobId = extractOpenRouterJobId(url)
      if (!jobId) {
        nextUrls.push(url)
        continue
      }
      try {
        const persisted = await ensureDurableVideoWithPoster({
          videoUrl: url,
          userId: String(row.user_id),
          generationId: String(row.id),
        })
        nextUrls.push(persisted.videoUrl)
        if (!firstDurable) firstDurable = persisted.videoUrl
        if (persisted.posterUrl && !posterUrl) posterUrl = persisted.posterUrl
      } catch (e) {
        ok = false
        lastError = e instanceof Error ? e.message : 'persist failed'
        nextUrls.push(url)
      }
    }

    if (firstDurable && !posterUrl) {
      try {
        posterUrl = await ensurePosterForDurableVideo({
          videoUrl: firstDurable,
          userId: String(row.user_id),
          generationId: String(row.id),
          existingThumbnail: row.thumbnail_url,
        })
      } catch {
        /* best-effort */
      }
    }

    if (ok && firstDurable) {
      const { error: upErr } = await supabase
        .from('ad_studio_generations')
        .update({
          video_urls: nextUrls,
          thumbnail_url: posterUrl || firstDurable,
        })
        .eq('id', row.id)

      if (upErr) {
        results.push({ id: String(row.id), ok: false, error: upErr.message })
      } else {
        results.push({
          id: String(row.id),
          ok: true,
          url: firstDurable,
          poster: posterUrl,
        })
      }
    } else {
      results.push({ id: String(row.id), ok: false, error: lastError || 'no durable url' })
    }
  }

  await writeAdminAudit({
    action: 'persist_videos',
    entity: 'ad_studio_generations',
    entityId: 'batch',
    payload: { attempted: candidates.length, results },
  })

  return NextResponse.json({
    attempted: candidates.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
