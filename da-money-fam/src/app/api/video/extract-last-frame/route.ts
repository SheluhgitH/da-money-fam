import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { extractAndUploadLastFrame } from '@/lib/storyboard-last-frame'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Extract last frame from any completed clip URL and upload as a reference still. */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawUrl = typeof body.videoUrl === 'string' ? body.videoUrl : ''
  if (!rawUrl) {
    return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  const url = await extractAndUploadLastFrame({
    userId: user.id,
    videoUrl: rawUrl,
    requestOrigin: origin,
  })

  if (!url) {
    return NextResponse.json(
      { error: 'Could not extract last frame from this clip.' },
      { status: 422 }
    )
  }

  return NextResponse.json({ url })
}
