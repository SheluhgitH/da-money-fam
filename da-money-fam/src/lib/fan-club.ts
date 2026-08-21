import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export type FanSubscription = {
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id: string | null
  status: 'active' | 'canceled' | 'past_due'
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export async function upsertFanSubscription(input: {
  user_id: string
  stripe_subscription_id: string
  stripe_customer_id?: string | null
  status: 'active' | 'canceled' | 'past_due'
  current_period_end?: string | null
}): Promise<void> {
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase.from('fan_subscriptions').upsert(
      {
        user_id: input.user_id,
        stripe_subscription_id: input.stripe_subscription_id,
        stripe_customer_id: input.stripe_customer_id ?? null,
        status: input.status,
        current_period_end: input.current_period_end ?? null,
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    return
  }

  const file = path.join(DATA_DIR, 'fan-subscriptions.json')
  let subs: FanSubscription[] = []
  try {
    subs = JSON.parse(await fs.readFile(file, 'utf-8'))
  } catch {
    subs = []
  }
  const idx = subs.findIndex((s) => s.user_id === input.user_id)
  const row: FanSubscription = {
    user_id: input.user_id,
    stripe_subscription_id: input.stripe_subscription_id,
    stripe_customer_id: input.stripe_customer_id ?? null,
    status: input.status,
    current_period_end: input.current_period_end ?? null,
    created_at: idx >= 0 ? subs[idx].created_at : now,
    updated_at: now,
  }
  if (idx >= 0) subs[idx] = row
  else subs.push(row)
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(subs, null, 2))
}

export async function getFanSubscription(userId: string): Promise<FanSubscription | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('fan_subscriptions').select('*').eq('user_id', userId).maybeSingle()
    if (!data) return null
    return {
      user_id: String(data.user_id),
      stripe_subscription_id: String(data.stripe_subscription_id),
      stripe_customer_id: data.stripe_customer_id ? String(data.stripe_customer_id) : null,
      status: data.status as FanSubscription['status'],
      current_period_end: data.current_period_end ? String(data.current_period_end) : null,
      created_at: String(data.created_at),
      updated_at: String(data.updated_at),
    }
  }

  const file = path.join(DATA_DIR, 'fan-subscriptions.json')
  try {
    const subs: FanSubscription[] = JSON.parse(await fs.readFile(file, 'utf-8'))
    return subs.find((s) => s.user_id === userId) || null
  } catch {
    return null
  }
}

export async function hasManualFanClub(userId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('profiles')
      .select('fan_club_manual')
      .eq('id', userId)
      .maybeSingle()
    return Boolean(data?.fan_club_manual)
  }
  return false
}

export async function setManualFanClub(userId: string, enabled: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { error } = await supabase
      .from('profiles')
      .update({ fan_club_manual: enabled })
      .eq('id', userId)
    if (error) throw new Error(error.message)
    return
  }
  throw new Error('Database not configured')
}

export async function isActiveFanClubMember(userId: string): Promise<boolean> {
  if (await hasManualFanClub(userId)) return true
  const sub = await getFanSubscription(userId)
  if (!sub || sub.status !== 'active') return false
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false
  return true
}

export async function setFanClubCustomerId(userId: string, customerId: string) {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase.from('fan_subscriptions').update({ stripe_customer_id: customerId }).eq('user_id', userId)
  }
}
