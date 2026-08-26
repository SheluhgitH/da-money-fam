import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { completeGenerationByJobId, getAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { ensureDurableVideoWithPoster } from '@/lib/ad-studio-video-storage'

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

  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    return NextResponse.json({ error: 'OpenRouter API Key not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Seedance Polling API Error Response:', JSON.stringify(errorData, null, 2))
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    const status = data.status as string
    const done = status === 'completed' || status === 'succeeded'

    const { searchParams } = new URL(req.url)
    const generationId = searchParams.get('generationId')

    let videoUrl: string | null = null
    let posterUrl: string | null = null
    if (done) {
      const proxyUrl = `/api/video/${jobId}/content`
      videoUrl = proxyUrl

      if (generationId) {
        let deferPersist = false
        try {
          const gen = await getAdStudioGeneration(user.id, generationId)
          if (gen?.mode === 'storyboard') {
            const remaining = gen.scenes.filter(
              (s) => s.jobId !== jobId && s.status !== 'completed'
            )
            deferPersist = remaining.length > 0
          }
        } catch (e) {
          console.error('Failed to load generation for persist decision:', e)
        }

        if (!deferPersist) {
          try {
            const persisted = await ensureDurableVideoWithPoster({
              videoUrl: proxyUrl,
              userId: user.id,
              generationId,
            })
            videoUrl = persisted.videoUrl
            posterUrl = persisted.posterUrl
          } catch (e) {
            console.error('Failed to persist video to storage:', e)
            videoUrl = proxyUrl
          }
        }
      }

      try {
        await completeGenerationByJobId({
          userId: user.id,
          jobId,
          videoUrl,
          generationId,
          thumbnailUrl: posterUrl,
        })
      } catch (e) {
        console.error('Failed to auto-complete generation:', e)
      }
    }

    return NextResponse.json({
      status,
      videoUrl,
      posterUrl,
      jobId,
    })
  } catch (error) {
    console.error('Video Polling API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
