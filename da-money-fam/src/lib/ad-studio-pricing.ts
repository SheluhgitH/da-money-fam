import { FAN_PERK_TIERS } from '@/lib/fan-perks'
import { getUserEntitlements } from '@/lib/user-entitlements'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  SEEDANCE_MODELS,
  type SeedanceModelKey,
} from '@/lib/seedance-models'
import { asPricingSettings, loadSiteSettingsMap } from '@/lib/site-settings'

/** @deprecated Prefer model.baseCoins via resolveSeedanceModel */
export const BASE_AD_VIDEO_COIN_PRICE = 20

const ALLOWED_DURATIONS = new Set([6, 8, 10])

export function normalizePricingDuration(durationSeconds: unknown): number {
  const n = Number(durationSeconds)
  return ALLOWED_DURATIONS.has(n) ? n : 6
}

export function computeAdClipCoinPrice(input: {
  baseCoins: number
  durationSeconds: number
  discountPercent: number
}): { priceCoins: number; baseCoinsBeforeDiscount: number } {
  const duration = normalizePricingDuration(input.durationSeconds)
  const baseCoinsBeforeDiscount = Math.max(
    1,
    Math.ceil(input.baseCoins * (duration / 6))
  )
  const priceCoins = Math.max(
    1,
    Math.ceil(
      input.baseCoins * (duration / 6) * (1 - input.discountPercent / 100)
    )
  )
  return { priceCoins, baseCoinsBeforeDiscount }
}

/** Effective per-clip price for a model at duration + discount (for UI chips). */
export function previewAdClipCoinPrice(
  modelKey: SeedanceModelKey,
  durationSeconds: number,
  discountPercent: number,
  baseCoinsOverride?: number
): { priceCoins: number; baseCoinsBeforeDiscount: number } {
  const model = SEEDANCE_MODELS[modelKey]
  return computeAdClipCoinPrice({
    baseCoins: baseCoinsOverride ?? model.baseCoins,
    durationSeconds,
    discountPercent,
  })
}

export interface AdVideoPricingInfo {
  priceCoins: number
  baseCoinsBeforeDiscount: number
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
  userCoins: number
  modelKey: SeedanceModelKey
  modelId: string
  baseCoins: number
  durationSeconds: number
}

export async function getAdVideoCoinPrice(
  modelInput?: SeedanceModelKey | string | null,
  durationSeconds: number = 6
): Promise<AdVideoPricingInfo> {
  const model = resolveSeedanceModel(modelInput ?? DEFAULT_SEEDANCE_MODEL)
  const duration = normalizePricingDuration(durationSeconds)
  const { level, fanClub, isAuthenticated } = await getUserEntitlements()
  const settings = asPricingSettings((await loadSiteSettingsMap())['ad_studio.pricing'])
  const baseCoins =
    model.key === 'lite' ? settings.liteBaseCoins : settings.fastBaseCoins

  let discountPercent = 0
  let tierOrFanClub: string | null = null

  if (fanClub) {
    discountPercent = settings.fanClubDiscountPercent
    tierOrFanClub = 'Fan Club'
  } else if (level >= 5) {
    discountPercent = 15
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 5)?.title || null
  } else if (level >= 4) {
    discountPercent = 10
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 4)?.title || null
  } else if (level >= 3) {
    discountPercent = 5
    tierOrFanClub = FAN_PERK_TIERS.find((t) => t.level === 3)?.title || null
  }

  const { priceCoins, baseCoinsBeforeDiscount } = computeAdClipCoinPrice({
    baseCoins,
    durationSeconds: duration,
    discountPercent,
  })

  return {
    priceCoins,
    baseCoinsBeforeDiscount,
    discountPercent,
    tierOrFanClub,
    isAuthenticated,
    userCoins: 0,
    modelKey: model.key,
    modelId: model.id,
    baseCoins,
    durationSeconds: duration,
  }
}
