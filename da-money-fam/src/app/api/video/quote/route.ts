import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdVideoCoinPrice } from '@/lib/ad-studio-pricing'
import { getUserCoins } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { resolveSeedanceModel } from '@/lib/seedance-models'

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

    const pricing = await getAdVideoCoinPrice(model.key)
    const userCoins = await getUserCoins(user.id)
    const fanClub = await isActiveFanClubMember(user.id)
    const totalPriceCoins = pricing.priceCoins * scenes * variations

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
      model: model.key,
      modelId: model.id,
      baseCoins: model.baseCoins,
    })
  } catch (error) {
    console.error('Error fetching video quote:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
