import { createClient } from '@supabase/supabase-js'
import { SEEDANCE_MODELS } from '@/lib/seedance-models'
import { IMAGE_MODELS } from '@/lib/image-models'
import { COIN_PACKAGES, type CoinPackage } from '@/lib/coin-packages'
import { HIDDEN_STREAM_VIDEO_IDS } from '@/data/kick-videos'
import { DEFAULT_HOMEPAGE_SECTIONS } from '@/lib/homepage-sections'

export type SiteSettingsMap = Record<string, unknown>

export interface AdStudioPricingSettings {
  liteBaseCoins: number
  miniBaseCoins: number
  fastBaseCoins: number
  fanClubDiscountPercent: number
  durations: number[]
}

export interface HomepageHeroSettings {
  kicker: string
  headline: string
  tagline: string
  primaryCta: string
  secondaryCta: string
}

export interface HomepageAboutSettings {
  imageUrl: string
}

const CACHE_MS = 60_000
let cache: { at: number; map: SiteSettingsMap } | null = null

function createSettingsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function defaultSiteSettings(): SiteSettingsMap {
  return {
    'ad_studio.pricing': {
      liteBaseCoins: SEEDANCE_MODELS.lite.baseCoins,
      miniBaseCoins: SEEDANCE_MODELS.mini.baseCoins,
      fastBaseCoins: SEEDANCE_MODELS.fast.baseCoins,
      fanClubDiscountPercent: 15,
      durations: [4, 6, 8, 10, 12],
    },
    'ad_studio.image_models': {
      draft: { baseCoins: IMAGE_MODELS.draft.baseCoins },
      fast: { baseCoins: IMAGE_MODELS.fast.baseCoins },
      edit: { baseCoins: IMAGE_MODELS.edit.baseCoins },
      smart: { baseCoins: IMAGE_MODELS.smart.baseCoins },
    },
    'ad_studio.packs': Object.fromEntries(
      COIN_PACKAGES.map((p) => [p.id, { amount: p.amount, price: p.price, label: p.label }])
    ),
    'homepage.hero': {
      kicker: 'Luxury Hip-Hop Collective',
      headline: 'DA MONEY FAM',
      tagline: 'Setting trends in music, fashion, and culture since day one',
      primaryCta: 'Listen Now',
      secondaryCta: 'Shop The Drop',
    },
    'homepage.about': {
      imageUrl: '/images/collective/collective-14.jpg',
    },
    'homepage.sections': DEFAULT_HOMEPAGE_SECTIONS,
    'streams.hidden_ids': Array.from(HIDDEN_STREAM_VIDEO_IDS),
  }
}

export async function loadSiteSettingsMap(force = false): Promise<SiteSettingsMap> {
  const defaults = defaultSiteSettings()
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return { ...defaults, ...cache.map }
  }

  const supabase = createSettingsClient()
  if (!supabase) return defaults

  const { data, error } = await supabase.from('site_settings').select('key, value')
  if (error || !data) {
    if (error) console.error('loadSiteSettingsMap:', error)
    return defaults
  }

  const map: SiteSettingsMap = {}
  for (const row of data) {
    map[String(row.key)] = row.value
  }
  cache = { at: Date.now(), map }
  return { ...defaults, ...map }
}

export function invalidateSiteSettingsCache() {
  cache = null
}

export async function upsertSiteSettings(entries: Record<string, unknown>): Promise<void> {
  const supabase = createSettingsClient()
  if (!supabase) throw new Error('Database not configured')

  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) throw new Error(error.message)
  invalidateSiteSettingsCache()
}

export async function writeAdminAudit(input: {
  action: string
  entity: string
  entityId?: string
  payload?: unknown
}) {
  const supabase = createSettingsClient()
  if (!supabase) return
  await supabase.from('admin_audit_log').insert({
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId || null,
    payload: input.payload ?? null,
  })
}

export function asPricingSettings(value: unknown): AdStudioPricingSettings {
  const defaults = defaultSiteSettings()['ad_studio.pricing'] as AdStudioPricingSettings
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    liteBaseCoins: Number(v.liteBaseCoins) || defaults.liteBaseCoins,
    miniBaseCoins: Number(v.miniBaseCoins) || defaults.miniBaseCoins,
    fastBaseCoins: Number(v.fastBaseCoins) || defaults.fastBaseCoins,
    fanClubDiscountPercent: Number(v.fanClubDiscountPercent) || defaults.fanClubDiscountPercent,
    durations: Array.isArray(v.durations)
      ? v.durations.map(Number).filter((n) => n > 0)
      : defaults.durations,
  }
}

export function asHeroSettings(value: unknown): HomepageHeroSettings {
  const defaults = defaultSiteSettings()['homepage.hero'] as HomepageHeroSettings
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    kicker: String(v.kicker || defaults.kicker),
    headline: String(v.headline || defaults.headline),
    tagline: String(v.tagline || defaults.tagline),
    primaryCta: String(v.primaryCta || defaults.primaryCta),
    secondaryCta: String(v.secondaryCta || defaults.secondaryCta),
  }
}

export function asAboutSettings(value: unknown): HomepageAboutSettings {
  const defaults = defaultSiteSettings()['homepage.about'] as HomepageAboutSettings
  const v = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    imageUrl: String(v.imageUrl || defaults.imageUrl),
  }
}

export function asHiddenStreamIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return Array.from(HIDDEN_STREAM_VIDEO_IDS)
}

export function packsFromSettings(value: unknown): CoinPackage[] {
  if (!value || typeof value !== 'object') return COIN_PACKAGES
  const obj = value as Record<string, Record<string, unknown>>
  const ids = Object.keys(obj)
  if (ids.length === 0) return COIN_PACKAGES
  return ids.map((id) => {
    const row = obj[id] || {}
    const amount = Number(row.amount) || 100
    return {
      id,
      amount,
      price: Number(row.price) || 8,
      label: String(row.label || id),
      liteAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.lite.baseCoins)),
      miniAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.mini.baseCoins)),
      fastAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.fast.baseCoins)),
      draftImages: Math.max(1, Math.floor(amount / IMAGE_MODELS.draft.baseCoins)),
    }
  })
}

export async function getResolvedCoinPackage(id: string): Promise<CoinPackage | undefined> {
  const map = await loadSiteSettingsMap()
  return packsFromSettings(map['ad_studio.packs']).find((p) => p.id === id)
}
