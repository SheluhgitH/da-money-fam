import { createClient } from '@supabase/supabase-js'
import { fetchOpenRouterVideoBuffer } from '@/lib/video-content-proxy'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import { isDurableVideoUrl, isImagePosterUrl } from '@/lib/ad-studio-video-urls'
import { extractMp4PosterJpeg } from '@/lib/ad-studio-poster'

export {
  isDurableVideoUrl,
  isImagePosterUrl,
  resolvePlayableVideoUrl,
  resolvePlayableVideoUrls,
} from '@/lib/ad-studio-video-urls'

export const AD_STUDIO_VIDEOS_BUCKET = 'ad-studio-videos'
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function ensureAdStudioVideosBucket(): Promise<void> {
  const supabase = serviceClient()
  if (!supabase) return
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === AD_STUDIO_VIDEOS_BUCKET)) return
  await supabase.storage.createBucket(AD_STUDIO_VIDEOS_BUCKET, {
    public: true,
    fileSizeLimit: MAX_VIDEO_UPLOAD_BYTES,
  })
}

async function uploadPosterFromBuffer(input: {
  buffer: Buffer | Uint8Array
  userId: string
  generationId: string
  jobId: string
}): Promise<string | null> {
  const supabase = serviceClient()
  if (!supabase) return null

  const jpeg = await extractMp4PosterJpeg(input.buffer)
  if (!jpeg) return null

  const path = `${input.userId}/${input.generationId}/${input.jobId}.jpg`
  const { error } = await supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).upload(path, jpeg, {
    upsert: true,
    contentType: 'image/jpeg',
    cacheControl: '31536000',
  })
  if (error) {
    console.error('Poster upload failed:', error.message)
    return null
  }
  const { data } = supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

export type PersistVideoResult = {
  videoUrl: string
  posterUrl: string | null
}

/**
 * Download OpenRouter job content and store permanently in Supabase Storage.
 * Also best-effort first-frame JPEG poster.
 */
export async function persistOpenRouterVideo(input: {
  jobId: string
  userId: string
  generationId: string
}): Promise<PersistVideoResult> {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Storage not configured')

  await ensureAdStudioVideosBucket()

  const result = await fetchOpenRouterVideoBuffer(input.jobId)
  if ('error' in result) {
    throw new Error(result.error || 'Failed to fetch OpenRouter video')
  }

  if (result.buffer.byteLength > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error('Video exceeds storage size limit')
  }

  const path = `${input.userId}/${input.generationId}/${input.jobId}.mp4`
  const contentType = result.contentType?.includes('video')
    ? result.contentType
    : 'video/mp4'
  const videoBytes = Buffer.from(result.buffer)

  const { error } = await supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).upload(
    path,
    videoBytes,
    { upsert: true, contentType, cacheControl: '31536000' }
  )
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to resolve public video URL')

  const posterUrl = await uploadPosterFromBuffer({
    buffer: videoBytes,
    userId: input.userId,
    generationId: input.generationId,
    jobId: input.jobId,
  })

  return { videoUrl: data.publicUrl, posterUrl }
}

/**
 * If url is already durable, return it. If it's a proxy path, persist and return CDN URL.
 * Poster is generated when persisting; callers that need the poster should use
 * {@link ensureDurableVideoWithPoster}.
 */
export async function ensureDurableVideoUrl(input: {
  videoUrl: string
  userId: string
  generationId: string
}): Promise<string> {
  const result = await ensureDurableVideoWithPoster(input)
  return result.videoUrl
}

export async function ensureDurableVideoWithPoster(input: {
  videoUrl: string
  userId: string
  generationId: string
}): Promise<PersistVideoResult> {
  if (isDurableVideoUrl(input.videoUrl)) {
    return { videoUrl: input.videoUrl, posterUrl: null }
  }
  const jobId = extractOpenRouterJobId(input.videoUrl)
  if (!jobId) return { videoUrl: input.videoUrl, posterUrl: null }
  return persistOpenRouterVideo({
    jobId,
    userId: input.userId,
    generationId: input.generationId,
  })
}

/**
 * For an already-durable MP4 CDN URL, download and generate a poster if missing.
 */
export async function ensurePosterForDurableVideo(input: {
  videoUrl: string
  userId: string
  generationId: string
  existingThumbnail?: string | null
}): Promise<string | null> {
  if (isImagePosterUrl(input.existingThumbnail)) return input.existingThumbnail!
  if (!isDurableVideoUrl(input.videoUrl)) return null

  const supabase = serviceClient()
  if (!supabase) return null

  try {
    const res = await fetch(input.videoUrl)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > MAX_VIDEO_UPLOAD_BYTES) return null

    const jobId =
      input.videoUrl.match(/\/([^/]+)\.mp4(\?|$)/i)?.[1] ||
      input.generationId.slice(0, 12)

    return uploadPosterFromBuffer({
      buffer: buf,
      userId: input.userId,
      generationId: input.generationId,
      jobId,
    })
  } catch (e) {
    console.error('ensurePosterForDurableVideo:', e)
    return null
  }
}
