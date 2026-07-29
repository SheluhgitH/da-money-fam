import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export type ReferralRecord = {
  id: string
  referrer_id: string
  referred_user_id: string | null
  buyer_email: string
  order_id: string
  status: 'pending' | 'rewarded'
  created_at: string
}

export async function recordReferralPurchase(input: {
  referrer_id: string
  referred_user_id: string | null
  buyer_email: string
  order_id: string
}): Promise<ReferralRecord | null> {
  if (!input.referrer_id) return null
  if (input.referred_user_id && input.referrer_id === input.referred_user_id) return null

  const now = new Date().toISOString()
  const record: ReferralRecord = {
    id: crypto.randomUUID(),
    referrer_id: input.referrer_id,
    referred_user_id: input.referred_user_id,
    buyer_email: input.buyer_email,
    order_id: input.order_id,
    status: 'pending',
    created_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('buyer_email', input.buyer_email)
      .maybeSingle()
    if (existing) return null

    const { data, error } = await supabase.from('referrals').insert(record).select('*').single()
    if (error) {
      console.error('recordReferralPurchase:', error.message)
      return null
    }
    return data as ReferralRecord
  }

  const file = path.join(DATA_DIR, 'referrals.json')
  let records: ReferralRecord[] = []
  try {
    records = JSON.parse(await fs.readFile(file, 'utf-8'))
  } catch {
    records = []
  }
  if (records.some((r) => r.buyer_email === input.buyer_email)) return null
  records.unshift(record)
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(file, JSON.stringify(records, null, 2))
  return record
}

export async function rewardReferrer(referrerId: string): Promise<string | null> {
  const stripe = getStripe()
  try {
    const coupon = await stripe.coupons.create({
      amount_off: 100,
      currency: 'usd',
      duration: 'once',
      name: 'DMF Referral Reward',
    })
    return coupon.id
  } catch (error) {
    console.error('rewardReferrer coupon create failed:', error)
    return null
  }
}

export async function completeReferralReward(referralId: string, couponId: string) {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase
      .from('referrals')
      .update({ status: 'rewarded', coupon_id: couponId })
      .eq('id', referralId)
    return
  }

  const file = path.join(DATA_DIR, 'referrals.json')
  try {
    const records: ReferralRecord[] = JSON.parse(await fs.readFile(file, 'utf-8'))
    const next = records.map((r) =>
      r.id === referralId ? { ...r, status: 'rewarded' as const } : r
    )
    await fs.writeFile(file, JSON.stringify(next, null, 2))
  } catch {
    // no local file yet
  }
}

export async function listReferralsForReferrer(referrerId: string): Promise<ReferralRecord[]> {
  if (!referrerId) return []

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('listReferralsForReferrer:', error.message)
      return []
    }
    return (data || []) as ReferralRecord[]
  }

  const file = path.join(DATA_DIR, 'referrals.json')
  try {
    const records: ReferralRecord[] = JSON.parse(await fs.readFile(file, 'utf-8'))
    return records
      .filter((r) => r.referrer_id === referrerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch {
    return []
  }
}
