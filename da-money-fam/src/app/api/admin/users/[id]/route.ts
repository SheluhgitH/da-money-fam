import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'
import {
  adjustUserCoins,
  getCoinzLedger,
  getUserCoins,
  getUserStats,
  getUserCosmetics,
  grantCosmetic,
  revokeCosmetic,
} from '@/lib/user-store'
import { setManualFanClub, getFanSubscription } from '@/lib/fan-club'
import { writeAdminAudit } from '@/lib/site-settings'
import { isCosmeticSlug, sanitizeGiftMessage } from '@/lib/profile-cosmetics'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [stats, coinz, ledger, sub, songOrders, merchOrders, serviceOrders, gens, cosmetics] =
    await Promise.all([
      getUserStats(id),
      getUserCoins(id),
      getCoinzLedger(id, 30),
      getFanSubscription(id),
      supabase
        .from('purchase_orders')
        .select('id, song_title, status, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('merch_orders')
        .select('id, merch_name, status, price, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('service_orders')
        .select('id, package_name, status, deposit_amount, created_at')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('ad_studio_generations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id),
      getUserCosmetics(id),
    ])

  const stripeActive =
    sub?.status === 'active' &&
    (!sub.current_period_end || new Date(sub.current_period_end) >= new Date())

  return NextResponse.json({
    user: {
      id,
      email: profile.email || null,
      display_name: profile.display_name || null,
      avatar_url: profile.avatar_url || null,
      fan_club_manual: Boolean(profile.fan_club_manual),
      stripe_fan_status: sub?.status || null,
      fan_club_active: Boolean(profile.fan_club_manual) || stripeActive,
      created_at: profile.created_at,
      stats,
      coinz,
      ledger,
      song_orders: songOrders.data || [],
      merch_orders: merchOrders.data || [],
      service_orders: serviceOrders.data || [],
      ad_studio_count: gens.count ?? 0,
      cosmetics,
    },
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = params.id
  const supabase = service()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const body = await req.json()
  const result: Record<string, unknown> = {}

  if (typeof body.fan_club_manual === 'boolean') {
    await setManualFanClub(id, body.fan_club_manual)
    result.fan_club_manual = body.fan_club_manual
    await writeAdminAudit({
      action: 'fan_club_manual',
      entity: 'user',
      entityId: id,
      payload: { fan_club_manual: body.fan_club_manual },
    })
  }

  if (typeof body.display_name === 'string') {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: body.display_name.trim() || null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    result.display_name = body.display_name
  }

  if (body.adjust_coinz != null) {
    const delta = Number(body.adjust_coinz)
    if (!delta || Number.isNaN(delta)) {
      return NextResponse.json({ error: 'adjust_coinz must be a non-zero number' }, { status: 400 })
    }
    const note = typeof body.admin_note === 'string' ? body.admin_note.trim() : ''
    if (!note) {
      return NextResponse.json({ error: 'admin_note is required for Coinz adjustments' }, { status: 400 })
    }
    const balance = await adjustUserCoins(id, delta, {
      reason: delta > 0 ? 'admin_grant' : 'admin_deduct',
      adminNote: note,
    })
    result.coinz = balance
    await writeAdminAudit({
      action: 'adjust_coinz',
      entity: 'user',
      entityId: id,
      payload: { delta, note, balance },
    })
  }

  if (body.send_email && typeof body.email_subject === 'string' && typeof body.email_body === 'string') {
    const { data: profile } = await supabase.from('profiles').select('email, display_name').eq('id', id).maybeSingle()
    const to = profile?.email
    if (!to) {
      return NextResponse.json({ error: 'User has no email on file' }, { status: 400 })
    }
    const key = process.env.RESEND_API_KEY
    if (!key || key === 'your_api_key_here') {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }
    const resend = new Resend(key)
    await resend.emails.send({
      from: 'DMF <onboarding@resend.dev>',
      to,
      subject: body.email_subject,
      html: `<p>Hi ${profile?.display_name || 'there'},</p><div>${String(body.email_body).replace(/\n/g, '<br/>')}</div>`,
    })
    result.email_sent = true
    await writeAdminAudit({
      action: 'email_user',
      entity: 'user',
      entityId: id,
      payload: { subject: body.email_subject },
    })
  }

  if (body.grant_cosmetic != null) {
    if (!isCosmeticSlug(body.grant_cosmetic)) {
      return NextResponse.json({ error: 'Invalid cosmetic slug' }, { status: 400 })
    }
    const giftMessage = sanitizeGiftMessage(body.gift_message)
    const adminNote = typeof body.admin_note === 'string' ? body.admin_note.trim() : null
    const cosmetic = await grantCosmetic(id, body.grant_cosmetic, {
      giftMessage,
      adminNote,
    })
    result.cosmetic = cosmetic
    await writeAdminAudit({
      action: 'grant_cosmetic',
      entity: 'user',
      entityId: id,
      payload: {
        slug: body.grant_cosmetic,
        gift_message: giftMessage,
        admin_note: adminNote,
      },
    })
  }

  if (body.revoke_cosmetic != null) {
    if (!isCosmeticSlug(body.revoke_cosmetic)) {
      return NextResponse.json({ error: 'Invalid cosmetic slug' }, { status: 400 })
    }
    await revokeCosmetic(id, body.revoke_cosmetic)
    result.revoked = body.revoke_cosmetic
    await writeAdminAudit({
      action: 'revoke_cosmetic',
      entity: 'user',
      entityId: id,
      payload: { slug: body.revoke_cosmetic },
    })
  }

  return NextResponse.json({ ok: true, ...result })
}
