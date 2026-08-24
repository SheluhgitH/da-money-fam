import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdVideoCoinPrice, previewAdClipCoinPrice } from '@/lib/ad-studio-pricing'
import { getUserCoins } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { resolveSeedanceModel } from '@/lib/seedance-models'
import { asPricingSettings, loadSiteSettingsMap } from '@/lib/site-settings'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const scenes = Math.min(3, Math.max(1, Number(searchParams.get('scenes')) || 1))
    const variations = Math.min(2, Math.max(1, Number(searchParams.get('variations')) || 1))
    const model = resolveSeedanceModel(searchParams.get('model'))
    const duration = Number(searchParams.get('duration')) || 6
    const generateAudio = searchParams.get('audio') === '1' || searchParams.get('audio') === 'true'
    const resolution = searchParams.get('resolution') === '720p' ? '720p' : '480p'
    const hd720 = resolution === '720p' && model.resolutions.includes('720p')

    const pricing = await getAdVideoCoinPrice(model.key, duration, generateAudio, resolution)
    const studioPricing = asPricingSettings((await loadSiteSettingsMap())['ad_studio.pricing'])
    const userCoins = await getUserCoins(user.id)
    const fanClub = await isActiveFanClubMember(user.id)
    const totalPriceCoins = pricing.priceCoins * scenes * variations

    const previewDiscount = fanClub
      ? studioPricing.fanClubDiscountPercent
      : pricing.discountPercent

    const litePreview = previewAdClipCoinPrice(
      'lite',
      pricing.durationSeconds,
      previewDiscount,
      studioPricing.liteBaseCoins,
      false,
      false
    )
    const miniPreview = previewAdClipCoinPrice(
      'mini',
      pricing.durationSeconds,
      previewDiscount,
      studioPricing.miniBaseCoins,
      generateAudio,
      hd720
    )
    const fastPreview = previewAdClipCoinPrice(
      'fast',
      pricing.durationSeconds,
      previewDiscount,
      studioPricing.fastBaseCoins,
      generateAudio,
      false
    )

    const durationPrices: Record<
      number,
      { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon: number }
    > = {}
    for (const d of model.durations) {
      durationPrices[d] = previewAdClipCoinPrice(
        model.key,
        d,
        previewDiscount,
        pricing.baseCoins,
        generateAudio && model.supportsAudio,
        hd720
      )
    }

    return NextResponse.json({
      priceCoins: pricing.priceCoins,
      totalPriceCoins,
      balance: userCoins,
      canAfford: userCoins >= totalPriceCoins,
      discountPercent: pricing.discountPercent,
      tierOrFanClub: pricing.tierOrFanClub,
      isAuthenticated: pricing.isAuthenticated,
      fanClub,
      canEnhance: fanClub,
      scenes,
      variations,
      durationSeconds: pricing.durationSeconds,
      model: model.key,
      modelId: model.id,
      baseCoins: model.baseCoins,
      baseCoinsBeforeDiscount: pricing.baseCoinsBeforeDiscount,
      generateAudio: pricing.generateAudio,
      audioAddonCoins: pricing.audioAddon,
      resolution: pricing.resolution,
      resolutions: model.resolutions,
      modelPrices: {
        lite: litePreview,
        mini: miniPreview,
        fast: fastPreview,
      },
      durationPrices,
      durations: model.durations,
      supportsAudio: model.supportsAudio,
      supportsLastFrame: model.supportsLastFrame,
    })
  } catch (error) {
    console.error('Error fetching video quote:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
