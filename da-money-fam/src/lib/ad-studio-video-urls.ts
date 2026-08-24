import { extractOpenRouterJobId } from '@/lib/seedance-models'
import type { AdStudioGeneration } from '@/lib/ad-studio-types'

/** True when URL is a permanent http(s) CDN link, not our OpenRouter proxy path. */
export function isDurableVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith('/api/video/')) return false
  return /^https?:\/\//i.test(url)
}

/** True when URL looks like an image poster (not an MP4 / video proxy). */
export function isImagePosterUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith('/api/video/')) return false
  if (!/^https?:\/\//i.test(url)) return false
  return /\.(jpe?g|png|webp)(\?|$)/i.test(url)
}

/**
 * Prefer durable CDN URL. For proxy-only rows keep the auth proxy path so the
 * owner's library still works when the ad is not featured (showcase requires featured).
 * Public homepage should use /api/video/showcase/:id/content via the showcase API.
 */
export function resolvePlayableVideoUrl(
  gen: Pick<AdStudioGeneration, 'id' | 'video_urls'> | null | undefined
): string | null {
  if (!gen?.video_urls?.length) return null
  const durable = gen.video_urls.find(isDurableVideoUrl)
  if (durable) return durable
  return gen.video_urls[0] || null
}

export function resolvePlayableVideoUrls(
  gen: Pick<AdStudioGeneration, 'id' | 'video_urls'> | null | undefined
): string[] {
  if (!gen?.video_urls?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of gen.video_urls) {
    const resolved = isDurableVideoUrl(url) ? url : url
    if (!seen.has(resolved)) {
      seen.add(resolved)
      out.push(resolved)
    }
  }
  // If nothing durable and we only have proxies, keep them (auth content route)
  if (out.length === 0 && gen.video_urls[0]) {
    const jobId = extractOpenRouterJobId(gen.video_urls[0])
    if (jobId) out.push(`/api/video/${jobId}/content`)
  }
  return out
}

/** Public/share URL safe for unauthenticated viewers (featured ads). */
export function resolvePublicVideoUrl(
  gen: Pick<AdStudioGeneration, 'id' | 'video_urls'> | null | undefined
): string | null {
  if (!gen?.video_urls?.length) return null
  const durable = gen.video_urls.find(isDurableVideoUrl)
  if (durable) return durable
  if (gen.video_urls.some((u) => extractOpenRouterJobId(u))) {
    return `/api/video/showcase/${gen.id}/content`
  }
  return null
}
