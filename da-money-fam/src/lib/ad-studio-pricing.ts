import { FAN_PERK_TIERS } from '@/lib/fan-perks'
import { getUserEntitlements } from '@/lib/user-entitlements'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  type SeedanceModelKey,
} from '@/lib/seedance-models'

/** @deprecated Prefer model.baseCoins via resolveSeedanceModel */
export const BASE_AD_VIDEO_COIN_PRICE = 10

export interface AdVideoPricingInfo {
  priceCoins: number
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
  userCoins: number
  modelKey: SeedanceModelKey
  modelId: string
  baseCoins: number
}

export async function getAdVideoCoinPrice(
  modelInput?: SeedanceModelKey | string | null
): Promise<AdVideoPricingInfo> {
  const model = resolveSeedanceModel(modelInput ?? DEFAULT_SEEDANCE_MODEL)
  const { level, fanClub, isAuthenticated } = await getUserEntitlements()

  let discountPercent = 0
  let tierOrFanClub: string | null = null

  if (fanClub) {
    discountPercent = 30
    tierOrFanClub = 'Fan Club'
  } else if (level >= 5) {
    discountPercent = 30
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 5)?.title || null
  } else if (level >= 4) {
    discountPercent = 20
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 4)?.title || null
  } else if (level >= 3) {
    discountPercent = 10
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 3)?.title || null
  }

  const priceCoins = model.baseCoins * (1 - discountPercent / 100)

  return {
    priceCoins,
    discountPercent,
    tierOrFanClub,
    isAuthenticated,
    userCoins: 0,
    modelKey: model.key,
    modelId: model.id,
    baseCoins: model.baseCoins,
  }
}
