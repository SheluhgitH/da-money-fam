import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { enhanceStillPrompt } from '@/lib/ad-prompt-enhance'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fanClub = await isActiveFanClubMember(user.id)
  if (!fanClub) {
    return NextResponse.json(
      { error: 'Enhance is available for Fan Club members only' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    const refs = Array.isArray(body.reference_urls)
      ? (body.reference_urls as unknown[]).filter((u): u is string => typeof u === 'string')
      : []
    const enhancedPrompt = await enhanceStillPrompt(prompt, refs)
    return NextResponse.json({ enhancedPrompt })
  } catch (error) {
    console.error('images/enhance-preview:', error)
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 })
  }
}
