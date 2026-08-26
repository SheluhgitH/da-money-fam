import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { extractLastFrameJpeg } from '@/lib/ad-studio-poster'
import { uploadReferenceImage } from '@/lib/reference-upload'
import { MAX_VIDEO_UPLOAD_BYTES } from '@/lib/ad-studio-video-storage'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import { fetchOpenRouterVideoBuffer } from '@/lib/video-content-proxy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gen = await getAdStudioGeneration(user.id, params.id)
  if (!gen || gen.mode !== 'storyboard') {
    return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const rawUrl = typeof body.videoUrl === 'string' ? body.videoUrl : ''
  let videoUrl = rawUrl
  if (rawUrl.startsWith('/')) {
    videoUrl = new URL(rawUrl, req.url).href
  }
  if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  }

  try {
    const buf = await downloadClipBuffer(videoUrl)
    if (buf.byteLength > MAX_VIDEO_UPLOAD_BYTES) throw new Error('Clip too large')
    const jpeg = await extractLastFrameJpeg(buf)
    if (!jpeg) throw new Error('Could not extract last frame')
    const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
    const uploaded = await uploadReferenceImage({
      userId: user.id,
      dataUrlOrBase64: dataUrl,
      contentType: 'image/jpeg',
    })
    return NextResponse.json({ url: uploaded.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Last-frame extract failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
