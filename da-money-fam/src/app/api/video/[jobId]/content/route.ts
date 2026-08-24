import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { findGenerationByOpenRouterJobId, updateAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { fetchOpenRouterVideoBuffer, serveBufferedVideo } from '@/lib/video-content-proxy'
import {
  ensureDurableVideoWithPoster,
  isDurableVideoUrl,
} from '@/lib/ad-studio-video-storage'
import { extractOpenRouterJobId } from '@/lib/seedance-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  try {
    const gen = await findGenerationByOpenRouterJobId(jobId)
    if (gen) {
      const durable =
        gen.video_urls.find(isDurableVideoUrl) ||
        gen.video_urls.find((u) => u.includes(`${jobId}.mp4`))
      if (durable && isDurableVideoUrl(durable)) {
        return NextResponse.redirect(durable, 302)
      }

      // Owner (or any auth user with library access) — try persist then redirect
      if (gen.user_id === user.id) {
        try {
          const persisted = await ensureDurableVideoWithPoster({
            videoUrl: `/api/video/${jobId}/content`,
            userId: gen.user_id,
            generationId: gen.id,
          })
          if (isDurableVideoUrl(persisted.videoUrl)) {
            const urls = gen.video_urls.map((u) =>
              extractOpenRouterJobId(u) === jobId || u.includes(jobId)
                ? persisted.videoUrl
                : u
            )
            if (!urls.includes(persisted.videoUrl)) urls.push(persisted.videoUrl)
            await updateAdStudioGeneration(gen.user_id, gen.id, {
              video_urls: urls,
              thumbnail_url: persisted.posterUrl || persisted.videoUrl,
            })
            return NextResponse.redirect(persisted.videoUrl, 302)
          }
        } catch (e) {
          console.error('Job content persist failed:', e)
        }
      }
    }

    const result = await fetchOpenRouterVideoBuffer(jobId)
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      )
    }

    return serveBufferedVideo(result.buffer, {
      request: req,
      contentType: result.contentType,
      cacheControl: 'private, max-age=3600',
      filename: `dmf-ad-${jobId}.mp4`,
    })
  } catch (error) {
    console.error('Video content proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
