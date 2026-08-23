import type { SupabaseClient } from '@supabase/supabase-js'
import { COIN_RETAIL_USD } from '@/lib/coin-economy'
import { IMAGE_MODELS, IMAGE_TIERS } from '@/lib/image-models'

export type VideoStudioStats = {
  today: number
  week: number
  coinzToday: number
  coinzWeek: number
  failedToday: number
  failRate: number
}

export type ImageTierStat = {
  tier: string
  label: string
  modelId: string
  gens: number
  avgUsdCost: number
  avgRealRevenueUsd: number
  impliedMargin: number | null
  overBuffer: boolean
}

export type ImageStudioStats = {
  today: number
  week: number
  coinzToday: number
  coinzWeek: number
  costUsdWeek: number
  tiers: ImageTierStat[]
}

export type RecentVideoGen = {
  id: string
  brief: string | null
  status: string
  coinz_spent: number
  created_at: string
  mode: string
}

export type RecentImageGen = {
  id: string
  prompt: string | null
  model: string
  coinz_spent: number
  usd_cost: number | null
  created_at: string
  output_url: string | null
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function weekAgoIso() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
}

export function emptyVideoStats(): VideoStudioStats {
  return { today: 0, week: 0, coinzToday: 0, coinzWeek: 0, failedToday: 0, failRate: 0 }
}

export function emptyImageStats(): ImageStudioStats {
  return {
    today: 0,
    week: 0,
    coinzToday: 0,
    coinzWeek: 0,
    costUsdWeek: 0,
    tiers: IMAGE_TIERS.map((tier) => ({
      tier,
      label: IMAGE_MODELS[tier].label,
      modelId: IMAGE_MODELS[tier].id,
      gens: 0,
      avgUsdCost: 0,
      avgRealRevenueUsd: 0,
      impliedMargin: null,
      overBuffer: false,
    })),
  }
}

export function computeImageTier(
  rows: Array<{ model?: string | null; coinz_spent?: number | null; usd_cost?: number | null }>
): ImageTierStat[] {
  return IMAGE_TIERS.map((tier) => {
    const modelId = IMAGE_MODELS[tier].id
    const matched = rows.filter(
      (r) =>
        r.model === modelId ||
        IMAGE_MODELS[tier].fallbackIds.includes(String(r.model)) ||
        String(r.model).includes(tier)
    )
    const gens = matched.length
    const avgUsdCost =
      gens > 0 ? matched.reduce((s, r) => s + (Number(r.usd_cost) || 0), 0) / gens : 0
    const avgCoinz =
      gens > 0 ? matched.reduce((s, r) => s + (Number(r.coinz_spent) || 0), 0) / gens : 0
    const avgRealRevenueUsd = avgCoinz * COIN_RETAIL_USD
    const impliedMargin =
      avgRealRevenueUsd > 0
        ? Math.round(((avgRealRevenueUsd - avgUsdCost) / avgRealRevenueUsd) * 100)
        : null
    const overBuffer = gens >= 3 && avgUsdCost > IMAGE_MODELS[tier].usdEstimate * 1.4

    return {
      tier,
      label: IMAGE_MODELS[tier].label,
      modelId,
      gens,
      avgUsdCost: Number(avgUsdCost.toFixed(4)),
      avgRealRevenueUsd: Number(avgRealRevenueUsd.toFixed(4)),
      impliedMargin,
      overBuffer,
    }
  })
}

export async function loadVideoStudioStats(
  supabase: SupabaseClient
): Promise<VideoStudioStats> {
  const todayIso = startOfTodayIso()
  const weekIso = weekAgoIso()

  const [{ data: todayRows }, { data: weekRows }] = await Promise.all([
    supabase
      .from('ad_studio_generations')
      .select('status, coinz_spent, created_at')
      .gte('created_at', todayIso),
    supabase
      .from('ad_studio_generations')
      .select('status, coinz_spent, created_at')
      .gte('created_at', weekIso),
  ])

  const today = todayRows || []
  const week = weekRows || []
  const failedToday = today.filter((r) => r.status === 'failed').length

  return {
    today: today.length,
    week: week.length,
    coinzToday: today.reduce((sum, r) => sum + Number(r.coinz_spent || 0), 0),
    coinzWeek: week.reduce((sum, r) => sum + Number(r.coinz_spent || 0), 0),
    failedToday,
    failRate: today.length ? Math.round((failedToday / today.length) * 100) : 0,
  }
}

export async function loadImageStudioStats(
  supabase: SupabaseClient
): Promise<{ stats: ImageStudioStats; weekRows: Array<Record<string, unknown>> }> {
  const todayIso = startOfTodayIso()
  const weekIso = weekAgoIso()

  const { data, error } = await supabase
    .from('ad_studio_images')
    .select('id, model, coinz_spent, usd_cost, created_at, prompt, output_url')
    .gte('created_at', weekIso)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('loadImageStudioStats:', error)
    return { stats: emptyImageStats(), weekRows: [] }
  }

  const weekRows = data || []
  const todayRows = weekRows.filter((r) => String(r.created_at) >= todayIso)

  const stats: ImageStudioStats = {
    today: todayRows.length,
    week: weekRows.length,
    coinzToday: todayRows.reduce((s, r) => s + Number(r.coinz_spent || 0), 0),
    coinzWeek: weekRows.reduce((s, r) => s + Number(r.coinz_spent || 0), 0),
    costUsdWeek: Number(
      weekRows.reduce((s, r) => s + Number(r.usd_cost || 0), 0).toFixed(4)
    ),
    tiers: computeImageTier(weekRows),
  }

  return { stats, weekRows }
}

export async function loadRecentAdStudioActivity(supabase: SupabaseClient): Promise<{
  recentVideos: RecentVideoGen[]
  recentImages: RecentImageGen[]
}> {
  const [{ data: videos }, { data: images }] = await Promise.all([
    supabase
      .from('ad_studio_generations')
      .select('id, brief, status, coinz_spent, created_at, mode')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('ad_studio_images')
      .select('id, prompt, model, coinz_spent, usd_cost, created_at, output_url')
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  return {
    recentVideos: (videos || []).map((v) => ({
      id: String(v.id),
      brief: v.brief ? String(v.brief) : null,
      status: String(v.status),
      coinz_spent: Number(v.coinz_spent || 0),
      created_at: String(v.created_at),
      mode: String(v.mode || ''),
    })),
    recentImages: (images || []).map((i) => ({
      id: String(i.id),
      prompt: i.prompt ? String(i.prompt) : null,
      model: String(i.model || ''),
      coinz_spent: Number(i.coinz_spent || 0),
      usd_cost: i.usd_cost != null ? Number(i.usd_cost) : null,
      created_at: String(i.created_at),
      output_url: i.output_url ? String(i.output_url) : null,
    })),
  }
}
