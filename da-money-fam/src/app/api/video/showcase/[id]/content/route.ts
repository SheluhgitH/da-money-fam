import { NextResponse } from 'next/server'
import { getAdStudioGenerationById, updateAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { extractOpenRouterJobId } from '@/lib/seedance-models'
import { fetchOpenRouterVideoBuffer, serveBufferedVideo } from '@/lib/video-content-proxy'
import {
  ensureDurableVideoWithPoster,
  isDurableVideoUrl,
} from '@/lib/ad-studio-video-storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  const durable = gen.video_urls.find(isDurableVideoUrl)
  if (durable) {
    return NextResponse.redirect(durable, 302)
  }

  const jobId = extractOpenRouterJobId(gen.video_urls[0])
  if (!jobId) {
    return NextResponse.json({ error: 'Video unavailable' }, { status: 404 })
  }

  try {
    // Persist once, then redirect to CDN for future requests / Range-friendly playback
    try {
      const persisted = await ensureDurableVideoWithPoster({
        videoUrl: gen.video_urls[0],
        userId: gen.user_id,
        generationId: gen.id,
      })
      if (isDurableVideoUrl(persisted.videoUrl)) {
        const urls = gen.video_urls.map((u) =>
          extractOpenRouterJobId(u) === jobId ? persisted.videoUrl : u
        )
        if (!urls.includes(persisted.videoUrl)) urls.unshift(persisted.videoUrl)
        await updateAdStudioGeneration(gen.user_id, gen.id, {
          video_urls: urls,
          thumbnail_url: persisted.posterUrl || persisted.videoUrl,
        })
        return NextResponse.redirect(persisted.videoUrl, 302)
      }
    } catch (persistErr) {
      console.error('Showcase persist failed, falling back to proxy:', persistErr)
    }

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
