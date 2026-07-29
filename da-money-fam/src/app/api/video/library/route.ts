import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import {
  createAdStudioGeneration,
  listAdStudioGenerations,
  updateAdStudioGeneration,
} from '@/lib/ad-studio-jobs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await listAdStudioGenerations(user.id)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Library GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (body.id && body.patch) {
      const updated = await updateAdStudioGeneration(user.id, body.id, body.patch)
      if (!updated) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json({ item: updated })
    }

    const item = await createAdStudioGeneration({
      user_id: user.id,
      mode: body.mode === 'storyboard' ? 'storyboard' : 'single',
      brief: body.brief,
      scenes: body.scenes,
      creative: body.creative,
      aspect_ratio: body.aspect_ratio,
      duration_seconds: body.duration_seconds,
      video_urls: body.video_urls,
      thumbnail_url: body.thumbnail_url,
      coinz_spent: body.coinz_spent,
      status: body.status || 'completed',
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Library POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
