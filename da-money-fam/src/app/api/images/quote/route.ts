import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserCoins } from '@/lib/user-store'
import { buildImageQuote, getImageCoinPrice } from '@/lib/image-pricing'
import { IMAGE_MODELS, IMAGE_TIERS } from '@/lib/image-models'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const tierParam = searchParams.get('tier') || 'fast'
    const pricing = await getImageCoinPrice(tierParam)
    const balance = await getUserCoins(user.id)
    const { quoteId, expiresAt } = buildImageQuote(
      pricing.tier,
      pricing.priceCoins,
      pricing.modelId
    )

    const tierPrices: Record<string, { priceCoins: number; baseCoinsBeforeDiscount: number }> = {}
    for (const t of IMAGE_TIERS) {
      const p = await getImageCoinPrice(t)
      tierPrices[t] = {
        priceCoins: p.priceCoins,
        baseCoinsBeforeDiscount: p.baseCoinsBeforeDiscount,
      }
    }

    return NextResponse.json({
      quoteId,
      expiresAt,
      priceCoins: pricing.priceCoins,
      balance,
      canAfford: balance >= pricing.priceCoins,
      discountPercent: pricing.discountPercent,
      tierOrFanClub: pricing.tierOrFanClub,
      tier: pricing.tier,
      modelId: pricing.modelId,
      baseCoinsBeforeDiscount: pricing.baseCoinsBeforeDiscount,
      tierPrices,
      models: IMAGE_TIERS.map((t) => ({
        tier: t,
        label: IMAGE_MODELS[t].label,
        id: IMAGE_MODELS[t].id,
        mode: IMAGE_MODELS[t].mode,
      })),
    })
  } catch (error) {
    console.error('images/quote:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
