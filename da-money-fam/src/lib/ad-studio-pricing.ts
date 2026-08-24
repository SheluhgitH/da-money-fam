import { FAN_PERK_TIERS } from '@/lib/fan-perks'
import { getUserEntitlements } from '@/lib/user-entitlements'
import {
  audioAddonCoins,
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  SEEDANCE_MODELS,
  type SeedanceModelKey,
} from '@/lib/seedance-models'
import { asPricingSettings, loadSiteSettingsMap } from '@/lib/site-settings'
import { videoVolumeFloor } from '@/lib/ad-studio-legacy-prices'

/** @deprecated Prefer model.baseCoins via resolveSeedanceModel */
export const BASE_AD_VIDEO_COIN_PRICE = 20

export function normalizePricingDuration(
  durationSeconds: unknown,
  allowed?: number[]
): number {
  const n = Number(durationSeconds)
  const list = allowed && allowed.length ? allowed : [6, 8, 10]
  return list.includes(n) ? n : list.includes(6) ? 6 : list[0]
}

export function computeAdClipCoinPrice(input: {
  baseCoins: number
  durationSeconds: number
  discountPercent: number
  volumeFloor?: number
  generateAudio?: boolean
  hd720?: boolean
}): { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon: number } {
  const duration = input.durationSeconds > 0 ? input.durationSeconds : 6
  const hd = input.hd720 ? 1.75 : 1
  const baseCoinsBeforeDiscount = Math.max(
    1,
    Math.ceil(input.baseCoins * (duration / 6) * hd)
  )
  let priceCoins = Math.max(
    1,
    Math.ceil(
      input.baseCoins * (duration / 6) * hd * (1 - input.discountPercent / 100)
    )
  )
  const floor480 = input.volumeFloor != null && input.volumeFloor > 0 ? input.volumeFloor : 0
  const floor = input.hd720 ? Math.max(floor480, Math.ceil(floor480 * 1.75)) : floor480
  if (floor > 0) {
    priceCoins = Math.max(priceCoins, floor)
  }
  if (input.hd720) {
    const p480 = Math.max(
      1,
      Math.ceil(input.baseCoins * (duration / 6) * (1 - input.discountPercent / 100))
    )
    const floor480 = input.volumeFloor != null && input.volumeFloor > 0 ? input.volumeFloor : 0
    priceCoins = Math.max(priceCoins, Math.max(p480, floor480))
  }
  const audioAddon = input.generateAudio ? audioAddonCoins(input.baseCoins) : 0
  priceCoins += audioAddon
  return { priceCoins, baseCoinsBeforeDiscount, audioAddon }
}

export function previewAdClipCoinPrice(
  modelKey: SeedanceModelKey,
  durationSeconds: number,
  discountPercent: number,
  baseCoinsOverride?: number,
  generateAudio = false,
  hd720 = false
): { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon: number } {
  const model = SEEDANCE_MODELS[modelKey]
  const duration = normalizePricingDuration(durationSeconds, model.durations)
  const allowHd = hd720 && model.resolutions.includes('720p')
  return computeAdClipCoinPrice({
    baseCoins: baseCoinsOverride ?? model.baseCoins,
    durationSeconds: duration,
    discountPercent,
    volumeFloor: videoVolumeFloor(modelKey, duration),
    generateAudio: generateAudio && model.supportsAudio,
    hd720: allowHd,
  })
}

export interface AdVideoPricingInfo {
  priceCoins: number
  baseCoinsBeforeDiscount: number
  audioAddon: number
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
  userCoins: number
  modelKey: SeedanceModelKey
  modelId: string
  baseCoins: number
  durationSeconds: number
  generateAudio: boolean
  resolution: '480p' | '720p'
}

function settingsBaseForModel(
  key: SeedanceModelKey,
  settings: { liteBaseCoins: number; miniBaseCoins: number; fastBaseCoins: number }
): number {
  if (key === 'lite') return settings.liteBaseCoins
  if (key === 'mini') return settings.miniBaseCoins
  return settings.fastBaseCoins
}

export async function getAdVideoCoinPrice(
  modelInput?: SeedanceModelKey | string | null,
  durationSeconds: number = 6,
  generateAudio = false,
  resolution: '480p' | '720p' = '480p'
): Promise<AdVideoPricingInfo> {
  const model = resolveSeedanceModel(modelInput ?? DEFAULT_SEEDANCE_MODEL)
  const duration = normalizePricingDuration(durationSeconds, model.durations)
  const hd720 = resolution === '720p' && model.resolutions.includes('720p')
  const { level, fanClub, isAuthenticated } = await getUserEntitlements()
  const settings = asPricingSettings((await loadSiteSettingsMap())['ad_studio.pricing'])
  const baseCoins = settingsBaseForModel(model.key, settings)
  const audioOn = generateAudio && model.supportsAudio

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

  const floor = videoVolumeFloor(model.key, duration)
  const { priceCoins, baseCoinsBeforeDiscount, audioAddon } = computeAdClipCoinPrice({
    baseCoins,
    durationSeconds: duration,
    discountPercent,
    volumeFloor: floor,
    generateAudio: audioOn,
    hd720,
  })

  const silentPrice = priceCoins - audioAddon
  const effectiveDiscount =
    silentPrice < baseCoinsBeforeDiscount ? discountPercent : 0

  return {
    priceCoins,
    baseCoinsBeforeDiscount,
    audioAddon,
    discountPercent: effectiveDiscount,
    tierOrFanClub,
    isAuthenticated,
    userCoins: 0,
    modelKey: model.key,
    modelId: model.id,
    baseCoins,
    durationSeconds: duration,
    generateAudio: audioOn,
    resolution: hd720 ? '720p' : '480p',
  }
}
