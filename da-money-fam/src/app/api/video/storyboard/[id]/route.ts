import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration } from '@/lib/ad-studio-jobs'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gen = await getAdStudioGeneration(user.id, params.id)
  if (!gen) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    storyboardId: gen.id,
    status: gen.status,
    scenes: gen.scenes,
    video_urls: gen.video_urls,
    aspect_ratio: gen.aspect_ratio,
    duration_seconds: gen.duration_seconds,
  })
}
