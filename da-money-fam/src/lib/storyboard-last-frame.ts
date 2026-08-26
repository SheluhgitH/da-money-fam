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
  const res = await fetch(videoUrl)
  if (!res.ok) throw new Error('Failed to download clip')
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
  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !extractOpenRouterJobId(videoUrl)) {
    return null
  }
  try {
    const buf = await downloadClipBuffer(videoUrl)
    if (buf.byteLength > MAX_VIDEO_UPLOAD_BYTES) return null
    const jpeg = await extractLastFrameJpeg(buf)
    if (!jpeg) return null
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    const uploaded = await uploadReferenceImage({
      userId: input.userId,
      dataUrlOrBase64: dataUrl,
      contentType: 'image/jpeg',
    })
    return uploaded.url
  } catch {
    return null
  }
}
