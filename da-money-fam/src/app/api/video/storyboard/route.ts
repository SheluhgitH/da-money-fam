import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdVideoCoinPrice } from '@/lib/ad-studio-pricing'
import { debitUserCoins, creditUserCoins } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { normalizeDuration, submitSeedanceJob, toInputReferences } from '@/lib/seedance-submit'
import { createAdStudioGeneration } from '@/lib/ad-studio-jobs'
import type { StoryboardScene } from '@/lib/ad-studio-types'
import { resolveSeedanceModel, resolveSubmitResolution } from '@/lib/seedance-models'
import { composeVideoFirstFrame } from '@/lib/compose-video-first-frame'
import { appendStoryboardContinuity } from '@/lib/storyboard-prompts'

export const maxDuration = 120

/**
 * Starts a storyboard: debits for all scenes, generates scene 0.
 * Client continues with POST /api/video/storyboard/[id]/continue after extracting last frame.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    scenes: rawScenes,
    creative,
    enhance,
    duration_seconds,
    aspect_ratio,
    reference_images,
    model: modelInput,
    generate_audio,
    resolution: resolutionInput,
  } = body

  if (!Array.isArray(rawScenes) || rawScenes.length < 2 || rawScenes.length > 5) {
    return NextResponse.json({ error: 'Storyboard requires 2 to 5 scenes' }, { status: 400 })
  }

  const sceneBriefs = rawScenes
    .map((s: { brief?: string } | string) =>
      typeof s === 'string' ? s.trim() : String(s?.brief || '').trim()
    )
    .filter(Boolean)

  if (sceneBriefs.length < 2) {
    return NextResponse.json({ error: 'Each scene needs a brief' }, { status: 400 })
  }

  const wantsEnhance = enhance === true
  if (wantsEnhance) {
    const fanClub = await isActiveFanClubMember(user.id)
    if (!fanClub) {
      return NextResponse.json(
        { error: 'Enhance is available for Fan Club members only' },
        { status: 403 }
      )
    }
  }

  const model = resolveSeedanceModel(modelInput)
  const duration = normalizeDuration(duration_seconds, model.key)
  const wantsAudio = generate_audio === true
  const resolution = resolveSubmitResolution(model, resolutionInput)
  const sceneCount = sceneBriefs.length
  let debited = false
  let totalPrice = 0

  try {
    const pricing = await getAdVideoCoinPrice(model.key, duration, wantsAudio, resolution)
    if (!pricing.isAuthenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    totalPrice = pricing.priceCoins * sceneCount
    await debitUserCoins(user.id, totalPrice)
    debited = true

    const creativeSel = creative as Partial<CreativeSelections> | undefined
    const continuityBrief = appendStoryboardContinuity(
      `${sceneBriefs[0]}. Scene 1 of ${sceneCount} in a continuous ad storyboard.`,
      { walking: creativeSel?.motion === 'walking' }
    )
    const hasStills = toInputReferences(reference_images).length > 0
    const composedFirst = hasStills
      ? await composeVideoFirstFrame({
          userId: user.id,
          brief: continuityBrief,
          aspectRatio: typeof aspect_ratio === 'string' ? aspect_ratio : '9:16',
          referenceImages: reference_images,
        })
      : null
    const result = await submitSeedanceJob({
      brief: continuityBrief,
      creative: creativeSel,
      enhance: wantsEnhance,
      duration,
      aspect_ratio,
      reference_images,
      first_frame_image: composedFirst,
      last_frame_image: null,
      generate_audio: wantsAudio,
      model: model.key,
      resolution,
      storyboardMode: true,
      ignoreRefFrames: true,
    })

    const scenes: StoryboardScene[] = sceneBriefs.map((brief, i) => ({
      brief,
      jobId: i === 0 ? result.jobId : null,
      videoUrl: null,
      status: i === 0 ? 'processing' : 'pending',
    }))

    const gen = await createAdStudioGeneration({
      user_id: user.id,
      mode: 'storyboard',
      brief: sceneBriefs.join(' / '),
      scenes,
      creative: creative || null,
      aspect_ratio: aspect_ratio || '9:16',
      duration_seconds: duration,
      coinz_spent: totalPrice,
      status: 'processing',
      featured: true,
      model: model.id,
    })

    return NextResponse.json({
      storyboardId: gen.id,
      jobs: [{ sceneIndex: 0, jobId: result.jobId }],
      sceneCount,
      coinzSpent: totalPrice,
      pricePerScene: pricing.priceCoins,
      creative,
      enhance: wantsEnhance,
      duration_seconds: duration,
      aspect_ratio: aspect_ratio || '9:16',
      reference_images: reference_images || [],
      model: model.key,
    })
  } catch (error: unknown) {
    console.error('Storyboard API Error:', error)
    if (debited && totalPrice > 0) {
      try {
        await creditUserCoins(user.id, totalPrice)
      } catch (refundError) {
        console.error('Failed to refund Coinz:', refundError)
      }
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message === 'Insufficient Coinz') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    return NextResponse.json(
      { error: 'Storyboard Error', details: message },
      { status: 500 }
    )
  }
}
