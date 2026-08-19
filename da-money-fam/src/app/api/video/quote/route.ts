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

    const pricing = await getAdVideoCoinPrice(model.key, duration)
    const studioPricing = asPricingSettings((await loadSiteSettingsMap())['ad_studio.pricing'])
    const userCoins = await getUserCoins(user.id)
    const fanClub = await isActiveFanClubMember(user.id)
    const totalPriceCoins = pricing.priceCoins * scenes * variations

    const litePreview = previewAdClipCoinPrice(
      'lite',
      pricing.durationSeconds,
      pricing.discountPercent,
      studioPricing.liteBaseCoins
    )
    const fastPreview = previewAdClipCoinPrice(
      'fast',
      pricing.durationSeconds,
      pricing.discountPercent,
      studioPricing.fastBaseCoins
    )

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
      modelPrices: {
        lite: litePreview,
        fast: fastPreview,
      },
      durationPrices: {
        6: previewAdClipCoinPrice(model.key, 6, pricing.discountPercent, pricing.baseCoins),
        8: previewAdClipCoinPrice(model.key, 8, pricing.discountPercent, pricing.baseCoins),
        10: previewAdClipCoinPrice(model.key, 10, pricing.discountPercent, pricing.baseCoins),
      },
    })
  } catch (error) {
    console.error('Error fetching video quote:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
