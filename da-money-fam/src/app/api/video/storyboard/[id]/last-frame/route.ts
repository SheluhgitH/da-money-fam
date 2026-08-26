import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { extractAndUploadLastFrame } from '@/lib/storyboard-last-frame'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gen = await getAdStudioGeneration(user.id, params.id)
  if (!gen || gen.mode !== 'storyboard') {
    return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const rawUrl = typeof body.videoUrl === 'string' ? body.videoUrl : ''
  const origin = new URL(req.url).origin
  const url = await extractAndUploadLastFrame({
    userId: user.id,
    videoUrl: rawUrl,
    requestOrigin: origin,
  })
  if (!url) {
    return NextResponse.json({ error: 'Last-frame extract failed' }, { status: 502 })
  }
  return NextResponse.json({ url })
}
