import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { creditUserCoins } from '@/lib/user-store'
import { writeAdminAudit } from '@/lib/site-settings'
import { emptyVideoStats, loadVideoStudioStats } from '@/lib/admin-ad-studio-stats'

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
    const empty = emptyVideoStats()
    return NextResponse.json({
      items: [],
      stats: {
        today: empty.today,
        coinzSpentToday: empty.coinzToday,
        failedToday: empty.failedToday,
        failRate: empty.failRate,
        week: empty.week,
        coinzWeek: empty.coinzWeek,
      },
    })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const model = searchParams.get('model') || ''
  const limit = Math.min(Number(searchParams.get('limit') || 80), 200)

  let query = supabase
    .from('ad_studio_generations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (model) query = query.ilike('model', `%${model}%`)

  const { data, error } = await query
  if (error) {
    console.error('admin ad-studio list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items = data || []
  const userIds = Array.from(new Set(items.map((row) => String(row.user_id)).filter(Boolean)))
  const emails: Record<string, string> = {}
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)
    for (const p of profiles || []) {
      emails[String(p.id)] = String(p.email || '')
    }
  }

  const stats = await loadVideoStudioStats(supabase)

  return NextResponse.json({
    items: items.map((row) => ({
      ...row,
      user_email: emails[String(row.user_id)] || null,
    })),
    stats: {
      today: stats.today,
      coinzSpentToday: stats.coinzToday,
      failedToday: stats.failedToday,
      failRate: stats.failRate,
      week: stats.week,
      coinzWeek: stats.coinzWeek,
    },
  })
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.featured === 'boolean') {
    patch.featured = body.featured
    patch.admin_hidden = !body.featured
  }
  if (typeof body.admin_hidden === 'boolean') {
    patch.admin_hidden = body.admin_hidden
    if (body.admin_hidden) patch.featured = false
  }
  if (typeof body.status === 'string') patch.status = body.status
  if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes

  const { data, error } = await supabase
    .from('ad_studio_generations')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await writeAdminAudit({
    action: 'patch',
    entity: 'ad_studio_generation',
    entityId: id,
    payload: patch,
  })

  return NextResponse.json({ item: data })
}
