import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { creditUserCoins } from '@/lib/user-store'
import { writeAdminAudit } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: gen, error } = await supabase
    .from('ad_studio_generations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !gen) {
    return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
  }

  if (gen.refunded_at) {
    return NextResponse.json({ error: 'Already refunded' }, { status: 400 })
  }

  const amount = Math.max(1, Number(body.amount ?? gen.coinz_spent) || 0)
  if (amount <= 0) {
    return NextResponse.json({ error: 'Nothing to refund' }, { status: 400 })
  }

  const newBalance = await creditUserCoins(String(gen.user_id), amount)
  const now = new Date().toISOString()

  const { data: updated, error: updateError } = await supabase
    .from('ad_studio_generations')
    .update({
      refunded_at: now,
      refund_coinz: amount,
      status: gen.status === 'completed' ? gen.status : 'failed',
      admin_notes: [gen.admin_notes, `Refunded ${amount} Coinz`].filter(Boolean).join(' | '),
      updated_at: now,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await writeAdminAudit({
    action: 'refund',
    entity: 'ad_studio_generation',
    entityId: id,
    payload: { amount, newBalance },
  })

  return NextResponse.json({ item: updated, newBalance })
}
