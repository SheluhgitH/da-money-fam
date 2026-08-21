import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'
import { COIN_RETAIL_USD } from '@/lib/coin-economy'
import { IMAGE_MODELS, IMAGE_TIERS } from '@/lib/image-models'

export const dynamic = 'force-dynamic'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ tiers: [], items: [] })
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('ad_studio_images')
    .select('id, model, coinz_spent, usd_cost, created_at, prompt, output_url')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('admin images:', error)
    return NextResponse.json({ tiers: [], items: [], error: error.message })
  }

  const rows = data || []
  const byTier = IMAGE_TIERS.map((tier) => {
    const modelId = IMAGE_MODELS[tier].id
    const matched = rows.filter(
      (r) =>
        r.model === modelId ||
        IMAGE_MODELS[tier].fallbackIds.includes(String(r.model)) ||
        String(r.model).includes(tier)
    )
    const gens = matched.length
    const avgUsdCost =
      gens > 0
        ? matched.reduce((s, r) => s + (Number(r.usd_cost) || 0), 0) / gens
        : 0
    const avgCoinz =
      gens > 0 ? matched.reduce((s, r) => s + (Number(r.coinz_spent) || 0), 0) / gens : 0
    const avgRealRevenueUsd = avgCoinz * COIN_RETAIL_USD
    const impliedMargin =
      avgRealRevenueUsd > 0
        ? Math.round(((avgRealRevenueUsd - avgUsdCost) / avgRealRevenueUsd) * 100)
        : null
    const overBuffer =
      gens >= 3 && avgUsdCost > IMAGE_MODELS[tier].usdEstimate * 1.4

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

  return NextResponse.json({
    tiers: byTier,
    items: rows.slice(0, 40),
  })
}
