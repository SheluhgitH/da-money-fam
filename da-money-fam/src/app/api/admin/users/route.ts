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

export async function GET(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ users: [], total: 0 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)

  let query = supabase
    .from('profiles')
    .select('id, email, display_name, fan_club_manual, created_at, avatar_url')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (q) {
    query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  const { data: profiles, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = profiles || []
  const ids = rows.map((p) => String(p.id))

  const [{ data: stats }, { data: coins }, { data: subs }] = await Promise.all([
    ids.length
      ? supabase.from('user_stats').select('user_id, xp, level, streak').in('user_id', ids)
      : Promise.resolve({ data: [] as { user_id: string; xp: number; level: number; streak: number }[] }),
    ids.length
      ? supabase.from('user_coins').select('user_id, amount').in('user_id', ids)
      : Promise.resolve({ data: [] as { user_id: string; amount: number }[] }),
    ids.length
      ? supabase
          .from('fan_subscriptions')
          .select('user_id, status, current_period_end')
          .in('user_id', ids)
      : Promise.resolve({
          data: [] as { user_id: string; status: string; current_period_end: string | null }[],
        }),
  ])

  const statsMap = Object.fromEntries((stats || []).map((s) => [String(s.user_id), s]))
  const coinsMap = Object.fromEntries((coins || []).map((c) => [String(c.user_id), Number(c.amount)]))
  const subMap = Object.fromEntries((subs || []).map((s) => [String(s.user_id), s]))

  const users = rows.map((p) => {
    const id = String(p.id)
    const sub = subMap[id]
    const stripeActive =
      sub?.status === 'active' &&
      (!sub.current_period_end || new Date(sub.current_period_end) >= new Date())
    return {
      id,
      email: p.email || null,
      display_name: p.display_name || null,
      fan_club_manual: Boolean(p.fan_club_manual),
      stripe_fan_status: sub?.status || null,
      fan_club_active: Boolean(p.fan_club_manual) || stripeActive,
      level: Number(statsMap[id]?.level || 1),
      xp: Number(statsMap[id]?.xp || 0),
      streak: Number(statsMap[id]?.streak || 0),
      coinz: coinsMap[id] ?? 0,
      created_at: p.created_at,
    }
  })

  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true })

  return NextResponse.json({ users, total: count ?? users.length })
}
