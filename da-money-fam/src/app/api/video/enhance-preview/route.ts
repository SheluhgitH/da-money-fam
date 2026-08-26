import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { isActiveFanClubMember } from '@/lib/fan-club'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { buildBaseAdPrompt, enhanceAdPrompt, enhanceStoryboardScenes } from '@/lib/ad-prompt-enhance'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

async function withEnhanceTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('ENHANCE_TIMEOUT')), 18000)
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fanClub = await isActiveFanClubMember(user.id)
  if (!fanClub) {
    return NextResponse.json(
      { error: 'Enhance is available for Fan Club members only' },
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    const creative = body.creative as Partial<CreativeSelections> | undefined
    const referenceUrls = Array.isArray(body.reference_urls)
      ? (body.reference_urls as unknown[]).filter((u): u is string => typeof u === 'string')
      : []

    if (Array.isArray(body.scenes) && body.scenes.length >= 2) {
      const sceneBriefs = (body.scenes as unknown[])
        .map((s) =>
          typeof s === 'string'
            ? s
            : s && typeof s === 'object' && 'brief' in s
              ? String((s as { brief: unknown }).brief || '')
              : ''
        )
        .filter((b) => b.trim())

      if (sceneBriefs.length < 2) {
        return NextResponse.json({ error: 'At least 2 scene briefs required' }, { status: 400 })
      }

      const basePrompts = sceneBriefs.map((b) => buildBaseAdPrompt(b, creative))
      const enhancedPrompts = await withEnhanceTimeout(
        enhanceStoryboardScenes(sceneBriefs, creative, referenceUrls)
      )
      return NextResponse.json({
        mode: 'storyboard',
        basePrompts,
        enhancedPrompts,
        cached: false,
      })
    }

    const brief =
      typeof body.brief === 'string'
        ? body.brief.trim()
        : typeof body.prompt === 'string'
          ? body.prompt.trim()
          : ''

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 })
    }

    const basePrompt = buildBaseAdPrompt(brief, creative)
    const enhancedPrompt = await withEnhanceTimeout(
      enhanceAdPrompt(brief, creative, referenceUrls)
    )

    return NextResponse.json({
      mode: 'single',
      basePrompt,
      enhancedPrompt,
      cached: enhancedPrompt === basePrompt ? false : undefined,
    })
  } catch (error) {
    console.error('enhance-preview:', error)
    if (error instanceof Error && error.message === 'ENHANCE_TIMEOUT') {
      return NextResponse.json({ error: 'Enhance timed out. Try again or generate without it.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 })
  }
}
