import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'
import { emptyImageStats, loadImageStudioStats } from '@/lib/admin-ad-studio-stats'

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
    const empty = emptyImageStats()
    return NextResponse.json({
      tiers: empty.tiers,
      items: [],
      today: 0,
      week: 0,
      coinzToday: 0,
      coinzWeek: 0,
      costUsdWeek: 0,
    })
  }

  const { stats, weekRows } = await loadImageStudioStats(supabase)

  return NextResponse.json({
    tiers: stats.tiers,
    items: weekRows.slice(0, 40),
    today: stats.today,
    week: stats.week,
    coinzToday: stats.coinzToday,
    coinzWeek: stats.coinzWeek,
    costUsdWeek: stats.costUsdWeek,
  })
}
