import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'

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
    return NextResponse.json({
      usersTotal: 0,
      signupsWeek: 0,
      coinzSoldApprox: 0,
    })
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [{ count: usersTotal }, { count: signupsWeek }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('coinz_ledger')
      .select('amount')
      .eq('reason', 'purchase')
      .gte('created_at', weekAgo.toISOString()),
  ])

  const coinzSoldApprox = (ledger || []).reduce((sum, row) => sum + Math.max(0, Number(row.amount || 0)), 0)

  return NextResponse.json({
    usersTotal: usersTotal ?? 0,
    signupsWeek: signupsWeek ?? 0,
    coinzSoldApprox,
  })
}
