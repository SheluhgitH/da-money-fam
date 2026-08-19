import { NextResponse } from 'next/server'
import { getAdStudioGenerationById } from '@/lib/ad-studio-jobs'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import { fetchOpenRouterVideoBuffer, serveBufferedVideo } from '@/lib/video-content-proxy'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const gen = await getAdStudioGenerationById(id)
  if (
    !gen ||
    gen.featured === false ||
    gen.admin_hidden ||
    gen.status !== 'completed' ||
    !gen.video_urls?.length
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const jobId = extractOpenRouterJobId(gen.video_urls[0])
  if (!jobId) {
    return NextResponse.json({ error: 'Video unavailable' }, { status: 404 })
  }

  try {
    const result = await fetchOpenRouterVideoBuffer(jobId)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return serveBufferedVideo(result.buffer, {
      request: req,
      contentType: result.contentType,
      cacheControl: 'public, max-age=3600',
      filename: `dmf-showcase-${id}.mp4`,
    })
  } catch (error) {
    console.error('Showcase content proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
