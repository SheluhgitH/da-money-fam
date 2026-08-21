import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdVideoCoinPrice } from '@/lib/ad-studio-pricing'
import { debitUserCoins, creditUserCoins } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { normalizeDuration, submitSeedanceJob } from '@/lib/seedance-submit'
import { createAdStudioGeneration } from '@/lib/ad-studio-jobs'
import { resolveSeedanceModel } from '@/lib/seedance-models'

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
    first_frame_image,
    variations,
    saveToLibrary,
    model: modelInput,
    enhancedPrompt,
  } = body

  const userBrief =
    typeof brief === 'string' && brief.trim()
      ? brief.trim()
      : typeof prompt === 'string'
        ? prompt.trim()
        : ''

  if (!userBrief) {
    return NextResponse.json({ error: 'Brief is required' }, { status: 400 })
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
  const duration = normalizeDuration(duration_seconds)
  const variationCount = Math.min(2, Math.max(1, Number(variations) || 1))
  const refSource =
    Array.isArray(reference_images) && reference_images.length
      ? reference_images
      : reference_image_urls

  let debited = false
  let priceCoins = 0
  let totalPrice = 0

  try {
    const pricing = await getAdVideoCoinPrice(model.key, duration)
    if (!pricing.isAuthenticated) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    priceCoins = pricing.priceCoins
    totalPrice = priceCoins * variationCount
    await debitUserCoins(user.id, totalPrice)
    debited = true

    const jobs: Array<{ jobId: string; variationIndex: number }> = []

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
          first_frame_image,
          model: model.key,
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
