import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration, updateAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { concatStoryboardMp4s } from '@/lib/ad-studio-video-concat'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gen = await getAdStudioGeneration(user.id, params.id)
  if (!gen || gen.mode !== 'storyboard') {
    return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 })
  }

  const sceneUrls = gen.scenes
    .map((s) => s.videoUrl)
    .filter((u): u is string => typeof u === 'string' && u.length > 0)

  const clips = sceneUrls.length >= 2 ? sceneUrls : gen.video_urls.filter(Boolean)
  if (clips.length < 2) {
    return NextResponse.json({ error: 'Need at least two completed scenes' }, { status: 400 })
  }

  try {
    const stitchedUrl = await concatStoryboardMp4s({
      videoUrls: clips,
      userId: user.id,
      generationId: gen.id,
    })
    const video_urls = [stitchedUrl, ...clips.filter((u) => u !== stitchedUrl)]
    await updateAdStudioGeneration(user.id, gen.id, {
      video_urls,
      thumbnail_url: stitchedUrl,
      status: 'completed',
    })
    return NextResponse.json({ url: stitchedUrl, video_urls })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stitch failed'
    console.error('storyboard stitch:', message)
    return NextResponse.json({ error: message, video_urls: clips }, { status: 502 })
  }
}
