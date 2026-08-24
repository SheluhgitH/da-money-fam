import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/user'
import { creditUserCoins, debitUserCoins } from '@/lib/user-store'
import { parseImageQuoteId } from '@/lib/image-pricing'
import { resolveImageModel, type ImageTier } from '@/lib/image-models'
import { generateOpenRouterImage } from '@/lib/openrouter-images'
import { wrapImageEditPrompt, wrapInpaintPrompt, type EditStrength } from '@/lib/image-edit-prompt'
import { enhanceStillPrompt } from '@/lib/ad-prompt-enhance'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { FROM_STILL_IMAGE } from '@/lib/studio-templates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const rateHour = new Map<string, { count: number; reset: number }>()
const rateDay = new Map<string, { count: number; reset: number }>()

function checkRateLimit(userId: string): string | null {
  const now = Date.now()
  const hour = rateHour.get(userId)
  if (!hour || now > hour.reset) {
    rateHour.set(userId, { count: 1, reset: now + 60 * 60 * 1000 })
  } else {
    hour.count += 1
    if (hour.count > 30) return 'Rate limit: 30 images per hour'
  }

  const day = rateDay.get(userId)
  if (!day || now > day.reset) {
    rateDay.set(userId, { count: 1, reset: now + 24 * 60 * 60 * 1000 })
  } else {
    day.count += 1
    if (day.count > 100) return 'Rate limit: 100 images per day'
  }
  return null
}

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = checkRateLimit(user.id)
  if (limited) {
    return NextResponse.json({ error: limited }, { status: 429 })
  }

  let debited = false
  let priceCoins = 0

  try {
    const body = await req.json()
    const quoteId = typeof body.quoteId === 'string' ? body.quoteId : ''
    const quote = parseImageQuoteId(quoteId)
    if (!quote) {
      return NextResponse.json({ error: 'Quote expired or invalid', code: 'REQUOTE' }, { status: 409 })
    }

    const promptRaw = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const referenceUrls = Array.isArray(body.reference_urls)
      ? (body.reference_urls as unknown[]).filter(
          (u): u is string => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))
        )
      : []
    if (!promptRaw && referenceUrls.length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const tier = quote.tier as ImageTier
    const model = resolveImageModel(tier)
    const mode: 'generate' | 'edit' =
      body.mode === 'edit' || referenceUrls.length > 0
        ? model.mode === 'generate'
          ? 'generate'
          : 'edit'
        : 'generate'

    const aspectRatio =
      typeof body.aspect_ratio === 'string' && body.aspect_ratio ? body.aspect_ratio : '9:16'

    const resolvedRaw = promptRaw || FROM_STILL_IMAGE
    const alreadyLocked = /IMAGE EDIT of the provided|INPAINT:/i.test(resolvedRaw)
    const isEditPass =
      mode === 'edit' ||
      (referenceUrls.length > 0 && (tier === 'edit' || tier === 'smart'))
    const strength: EditStrength =
      body.edit_strength === 'subtle' || body.edit_strength === 'heavy'
        ? body.edit_strength
        : 'medium'
    const inpaint = body.inpaint === true
    const maskUrl =
      typeof body.mask_url === 'string' &&
      (body.mask_url.startsWith('http://') || body.mask_url.startsWith('https://'))
        ? body.mask_url
        : null
    const count = Math.min(4, Math.max(1, Number(body.count) || 1))

    if ((mode === 'edit' || inpaint) && referenceUrls.length === 0) {
      return NextResponse.json(
        { error: 'Add or select a still to edit' },
        { status: 400 }
      )
    }

    if (inpaint && (tier === 'draft' || tier === 'fast')) {
      return NextResponse.json(
        { error: 'Painted edits require Edit or Smart' },
        { status: 400 }
      )
    }

    if (body.enhance === true) {
      const fanClub = await isActiveFanClubMember(user.id)
      if (!fanClub) {
        return NextResponse.json(
          { error: 'Enhance is available for Fan Club members only' },
          { status: 403 }
        )
      }
    }

    let prompt = resolvedRaw
    if (body.enhance === true && !alreadyLocked) {
      prompt = await enhanceStillPrompt(prompt, referenceUrls)
    }
    if (inpaint && maskUrl && !alreadyLocked) {
      prompt = wrapInpaintPrompt(prompt, strength)
    } else if (isEditPass && !alreadyLocked) {
      prompt = wrapImageEditPrompt(prompt, strength)
    }

    const inputRefs =
      inpaint && maskUrl && referenceUrls[0]
        ? [referenceUrls[0], maskUrl]
        : referenceUrls

    priceCoins = quote.priceCoins * count
    await debitUserCoins(user.id, priceCoins, {
      reason: 'ad_studio_image',
      referenceId: quoteId.slice(0, 64),
    })
    debited = true

    const supabase = service()
    let imageId: string | null = null
    const urls: string[] = []
    let lastResult: Awaited<ReturnType<typeof generateOpenRouterImage>> | null = null
    for (let i = 0; i < count; i++) {
      lastResult = await generateOpenRouterImage({
        tier,
        prompt,
        aspectRatio,
        inputReferences: inputRefs,
        userId: user.id,
      })
      urls.push(lastResult.url)
      if (supabase) {
        const { data, error } = await supabase
          .from('ad_studio_images')
          .insert({
            user_id: user.id,
            prompt,
            model: lastResult.modelId,
            mode,
            aspect_ratio: aspectRatio,
            input_ref_urls: inputRefs,
            output_url: lastResult.url,
            coinz_spent: quote.priceCoins,
            usd_cost: lastResult.usdCost,
          })
          .select('id')
          .single()
        if (!error && data && i === 0) imageId = data.id
      }
    }

    return NextResponse.json({
      id: imageId,
      url: urls[0],
      urls,
      modelId: lastResult?.modelId,
      coinzSpent: priceCoins,
      tier,
      mode,
    })
  } catch (error) {
    console.error('images/generate:', error)
    if (debited && priceCoins > 0) {
      try {
        await creditUserCoins(user.id, priceCoins, {
          reason: 'image_gen_refund',
          adminNote: 'Auto-refund after image generation failure',
        })
      } catch (refundErr) {
        console.error('image refund failed:', refundErr)
      }
    }
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    if (message === 'Insufficient Coinz') {
      return NextResponse.json({ error: message }, { status: 402 })
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ items: [] })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 24))

  const { data, error } = await supabase
    .from('ad_studio_images')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('images list:', error)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: data || [] })
}
