import { extractLastFrameJpeg } from '@/lib/ad-studio-poster'
import { uploadReferenceImage } from '@/lib/reference-upload'
import { MAX_VIDEO_UPLOAD_BYTES } from '@/lib/ad-studio-video-storage'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import { fetchOpenRouterVideoBuffer } from '@/lib/video-content-proxy'

async function downloadClipBuffer(videoUrl: string): Promise<Buffer> {
  const jobId = extractOpenRouterJobId(videoUrl)
  if (jobId) {
    const result = await fetchOpenRouterVideoBuffer(jobId)
    if ('error' in result) throw new Error(result.error || 'Failed to download clip')
    return Buffer.from(result.buffer)
  }
  // Durable CDN / Supabase public URLs and other https sources.
  const res = await fetch(videoUrl, {
    redirect: 'follow',
    headers: { Accept: 'video/mp4,video/*,*/*' },
  })
  if (!res.ok) throw new Error(`Failed to download clip (${res.status})`)
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error(`Unexpected content-type for clip: ${contentType}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function extractAndUploadLastFrame(input: {
  userId: string
  videoUrl: string
  requestOrigin?: string
}): Promise<string | null> {
  let videoUrl = input.videoUrl
  if (videoUrl.startsWith('/') && input.requestOrigin) {
    videoUrl = new URL(videoUrl, input.requestOrigin).href
  }
  if (
    !videoUrl.startsWith('http://') &&
    !videoUrl.startsWith('https://') &&
    !extractOpenRouterJobId(videoUrl)
  ) {
    console.warn('extractAndUploadLastFrame: unsupported videoUrl', videoUrl.slice(0, 120))
    return null
  }
  try {
    const buf = await downloadClipBuffer(videoUrl)
    if (buf.byteLength > MAX_VIDEO_UPLOAD_BYTES) {
      console.warn('extractAndUploadLastFrame: clip too large', buf.byteLength)
      return null
    }
    const jpeg = await extractLastFrameJpeg(buf)
    if (!jpeg) {
      console.warn('extractAndUploadLastFrame: ffmpeg last-frame extract returned null')
      return null
    }
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    const uploaded = await uploadReferenceImage({
      userId: input.userId,
      dataUrlOrBase64: dataUrl,
      contentType: 'image/jpeg',
    })
    return uploaded.url
  } catch (err) {
    console.error(
      'extractAndUploadLastFrame failed:',
      err instanceof Error ? err.message : err
    )
    return null
  }
}
