import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateAdminSongCover } from '@/lib/song-cover'
import { isOpenRouterConfigured } from '@/lib/chat-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'OpenRouter API Key not configured' },
      { status: 503 }
    )
  }

  const rate = checkRateLimit('admin-song-generate-cover', 10, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const prompt = String(body.prompt || '').trim()
    const title = String(body.title || '').trim() || undefined

    if (!prompt && !title) {
      return NextResponse.json(
        { error: 'Cover prompt or song title is required' },
        { status: 400 }
      )
    }

    const result = await generateAdminSongCover({ prompt, title, tier: 'fast' })
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/admin/songs/generate-cover:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate cover' },
      { status: 500 }
    )
  }
}
