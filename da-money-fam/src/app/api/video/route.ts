import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdVideoCoinPrice } from '@/lib/ad-studio-pricing'
import { debitUserCoins, creditUserCoins } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { normalizeDuration, submitSeedanceJob, toInputReferences } from '@/lib/seedance-submit'
import { createAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { resolveSeedanceModel, resolveSubmitResolution } from '@/lib/seedance-models'
import { FROM_STILL_VIDEO } from '@/lib/studio-templates'
import { composeVideoFirstFrame } from '@/lib/compose-video-first-frame'
import {
  classifyReferenceRoles,
  openingSubjectUrls,
  type ReferenceRoleKind,
} from '@/lib/classify-reference-roles'
import {
  framesFromReferences,
  parseIdentityStrength,
  parseMotionMode,
} from '@/lib/ad-studio-motion'

function refOverridesFromSource(refSource: unknown): Record<string, ReferenceRoleKind> {
  const out: Record<string, ReferenceRoleKind> = {}
  if (!Array.isArray(refSource)) return out
  for (const item of refSource) {
    if (!item || typeof item !== 'object') continue
    const rec = item as { url?: unknown; refRole?: unknown }
    if (typeof rec.url !== 'string') continue
    if (
      rec.refRole === 'opening_subject' ||
      rec.refRole === 'appears_later' ||
      rec.refRole === 'identity'
    ) {
      out[rec.url] = rec.refRole
    }
  }
  return out
}

export const maxDuration = 120

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    prompt,
    brief,
    creative,
    enhance,
    duration_seconds,
    aspect_ratio,
    reference_images,
    reference_image_urls,
    generate_audio,
    variations,
    saveToLibrary,
    model: modelInput,
    enhancedPrompt,
    resolution: resolutionInput,
    motion_mode: motionModeInput,
    identity_strength: identityStrengthInput,
  } = body

  const motionMode = parseMotionMode(motionModeInput)
  const identityStrength = parseIdentityStrength(identityStrengthInput)

  const refSource =
    Array.isArray(reference_images) && reference_images.length
      ? reference_images
      : reference_image_urls
  const hasRefs = Array.isArray(refSource) && refSource.length > 0
  const { firstUrl: lockedFirst, lastUrl: lockedLast } = framesFromReferences(refSource)

  let userBrief =
    typeof brief === 'string' && brief.trim()
      ? brief.trim()
      : typeof prompt === 'string'
        ? prompt.trim()
        : ''

  if (!userBrief && hasRefs) {
    userBrief = FROM_STILL_VIDEO
  }

  if (!userBrief) {
    return NextResponse.json({ error: 'Brief is required' }, { status: 400 })
  }

  if (motionMode === 'animate_ab' && (!lockedFirst || !lockedLast)) {
    return NextResponse.json(
      { error: 'Animate A→B needs two stills marked Start and End.' },
      { status: 400 }
    )
  }
  if (motionMode === 'lock_start' && !lockedFirst) {
    return NextResponse.json(
      { error: 'Lock start needs one still marked Start.' },
      { status: 400 }
    )
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
  const variationCount = Math.min(2, Math.max(1, Number(variations) || 1))
  const wantsAudio = generate_audio === true
  const resolution = resolveSubmitResolution(model, resolutionInput)
  const lockFrames = motionMode === 'lock_start' || motionMode === 'animate_ab'

  let debited = false
  let priceCoins = 0
  let totalPrice = 0

  try {
    const pricing = await getAdVideoCoinPrice(model.key, duration, wantsAudio, resolution)
    if (!pricing.isAuthenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    priceCoins = pricing.priceCoins
    totalPrice = priceCoins * variationCount
    await debitUserCoins(user.id, totalPrice)
    debited = true

    const jobs: Array<{ jobId: string; variationIndex: number }> = []

    const refUrls = toInputReferences(refSource).map((r) => r.image_url.url)
    const refNames = Array.isArray(refSource)
      ? refSource.map((item: unknown) =>
          item && typeof item === 'object' && 'name' in item
            ? String((item as { name?: unknown }).name || '')
            : undefined
        )
      : []
    const classified =
      hasRefs && !lockFrames
        ? await classifyReferenceRoles({
            brief: userBrief,
            urls: refUrls,
            names: refNames,
            overrides: refOverridesFromSource(refSource),
          })
        : { roles: [], shotPlan: '' }
    const openUrls = openingSubjectUrls(classified.roles)

    const composedFirst =
      hasRefs && !lockFrames
        ? await composeVideoFirstFrame({
            userId: user.id,
            brief: userBrief,
            aspectRatio: typeof aspect_ratio === 'string' ? aspect_ratio : '9:16',
            referenceImages: refSource,
            openingRefUrls: openUrls.length ? openUrls : undefined,
          })
        : null

    const firstFrame = lockFrames ? lockedFirst : composedFirst
    const lastFrame =
      lockFrames && model.supportsLastFrame
        ? lockedLast
        : model.supportsLastFrame
          ? lockedLast
          : null

    for (let i = 0; i < variationCount; i++) {
      try {
        const result = await submitSeedanceJob({
          brief: userBrief,
          creative: creative as Partial<CreativeSelections> | undefined,
          enhance: wantsEnhance,
          enhancedPrompt:
            typeof enhancedPrompt === 'string' && enhancedPrompt.trim()
              ? enhancedPrompt.trim()
              : null,
          duration,
          aspect_ratio,
          reference_images: refSource,
          first_frame_image: firstFrame,
          last_frame_image: lastFrame,
          generate_audio: wantsAudio,
          model: model.key,
          resolution,
          ignoreRefFrames: lockFrames || Boolean(composedFirst),
          shotPlan: classified.shotPlan || null,
          identityStrength,
        })
        jobs.push({ jobId: result.jobId, variationIndex: i })
      } catch (err) {
        const remaining = (variationCount - i) * priceCoins
        if (remaining > 0) {
          await creditUserCoins(user.id, remaining)
          totalPrice -= remaining
        }
        if (jobs.length === 0) {
          debited = false
          const message = err instanceof Error ? err.message : 'Seedance rejected the request'
          return NextResponse.json({ error: 'Seedance Error', details: message }, { status: 502 })
        }
        break
      }
    }

    let generationId: string | null = null
    if (saveToLibrary !== false) {
      try {
        const gen = await createAdStudioGeneration({
          user_id: user.id,
          mode: 'single',
          brief: userBrief,
          scenes: jobs.map((j) => ({
            brief: userBrief,
            jobId: j.jobId,
            status: 'processing',
          })),
          creative: creative || null,
          aspect_ratio: aspect_ratio || '9:16',
          duration_seconds: duration,
          coinz_spent: totalPrice,
          status: 'processing',
          featured: true,
          model: model.id,
        })
        generationId = gen.id
      } catch (e) {
        console.error('Failed to save generation record:', e)
      }
    }

    return NextResponse.json({
      jobId: jobs[0]?.jobId,
      jobs,
      generationId,
      variations: jobs.length,
      coinzSpent: totalPrice,
      model: model.key,
      motionMode,
    })
  } catch (error: unknown) {
    console.error('Video API Error:', error)
    if (debited && totalPrice > 0) {
      try {
        await creditUserCoins(user.id, totalPrice)
      } catch (refundError) {
        console.error('Failed to refund Coinz after video error:', refundError)
      }
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message === 'Insufficient Coinz') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
