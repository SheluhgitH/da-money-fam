import { COIN_RETAIL_USD } from '@/lib/coin-economy'
import {
  IMAGE_MODELS,
  TIER_FLOOR,
  asImageModelSettings,
  type ImageTier,
  resolveImageModel,
} from '@/lib/image-models'
import { getUserEntitlements } from '@/lib/user-entitlements'
import { loadSiteSettingsMap } from '@/lib/site-settings'
import { createHmac, timingSafeEqual } from 'crypto'

export { TIER_FLOOR, asImageModelSettings, type ImageModelOverrides } from '@/lib/image-models'

const SAFETY_MULTIPLIER = 1.4
const TARGET_GROSS_MARGIN = 0.55
const QUOTE_TTL_MS = 5 * 60 * 1000
const IMAGE_DISCOUNT_CAP = 10

export function coinPriceForImage(tier: ImageTier, usdEstimate: number, overrideCoins?: number): number {
  const buffered = usdEstimate * SAFETY_MULTIPLIER
  const fromMargin = Math.ceil(buffered / (COIN_RETAIL_USD * (1 - TARGET_GROSS_MARGIN)))
  const floor = TIER_FLOOR[tier]
  const base = Math.max(floor, fromMargin)
  if (overrideCoins != null && Number.isFinite(overrideCoins)) {
    return Math.max(floor, Math.round(overrideCoins))
  }
  return base
}

export async function getImageCoinPrice(tierInput?: ImageTier | string | null): Promise<{
  tier: ImageTier
  modelId: string
  priceCoins: number
  baseCoinsBeforeDiscount: number
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
}> {
  const model = resolveImageModel(tierInput)
  const map = await loadSiteSettingsMap()
  const overrides = asImageModelSettings(map['ad_studio.image_models'])
  const override = overrides[model.tier]?.baseCoins
  const base = coinPriceForImage(model.tier, model.usdEstimate, override)

  const { level, fanClub, isAuthenticated } = await getUserEntitlements()
  let discountPercent = 0
  let tierOrFanClub: string | null = null

  // Edit + Smart never discounted. Draft/Fast at volume floor skip % discount.
  const atVolumeFloor = base <= TIER_FLOOR[model.tier]
  if ((model.tier === 'draft' || model.tier === 'fast') && !atVolumeFloor) {
    if (fanClub) {
      discountPercent = IMAGE_DISCOUNT_CAP
      tierOrFanClub = 'Fan Club'
    } else if (level >= 5) {
      discountPercent = IMAGE_DISCOUNT_CAP
      tierOrFanClub = 'Level 5'
    } else if (level >= 4) {
      discountPercent = Math.min(IMAGE_DISCOUNT_CAP, 10)
      tierOrFanClub = 'Level 4'
    } else if (level >= 3) {
      discountPercent = Math.min(IMAGE_DISCOUNT_CAP, 5)
      tierOrFanClub = 'Level 3'
    }
  } else if (
    (model.tier === 'draft' || model.tier === 'fast') &&
    atVolumeFloor &&
    (fanClub || level >= 3)
  ) {
    // Still label Fan Club / level for UX, but no Coinz off at floor prices
    if (fanClub) tierOrFanClub = 'Fan Club'
    else if (level >= 5) tierOrFanClub = 'Level 5'
    else if (level >= 4) tierOrFanClub = 'Level 4'
    else tierOrFanClub = 'Level 3'
  }

  const priceCoins = Math.max(
    TIER_FLOOR[model.tier],
    Math.ceil(base * (1 - discountPercent / 100))
  )

  return {
    tier: model.tier,
    modelId: model.id,
    priceCoins,
    baseCoinsBeforeDiscount: base,
    discountPercent,
    tierOrFanClub,
    isAuthenticated,
  }
}

function quoteSecret(): string {
  return (
    process.env.IMAGE_QUOTE_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.OPENROUTER_API_KEY ||
    'dmf-image-quote'
  )
}

export interface ImageQuotePayload {
  tier: ImageTier
  priceCoins: number
  modelId: string
  exp: number
}

export function createImageQuoteId(payload: ImageQuotePayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', quoteSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function parseImageQuoteId(quoteId: string): ImageQuotePayload | null {
  const [body, sig] = quoteId.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', quoteSecret()).update(body).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ImageQuotePayload
    if (!payload.tier || !payload.priceCoins || !payload.exp) return null
    if (Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export function buildImageQuote(tier: ImageTier, priceCoins: number, modelId: string): {
  quoteId: string
  expiresAt: number
} {
  const exp = Date.now() + QUOTE_TTL_MS
  const quoteId = createImageQuoteId({ tier, priceCoins, modelId, exp })
  return { quoteId, expiresAt: exp }
}
