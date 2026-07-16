import { cookies } from 'next/headers'
import { REFERRAL_COOKIE } from '@/lib/referrals-constants'

export { REFERRAL_COOKIE } from '@/lib/referrals-constants'

export async function getReferralCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(REFERRAL_COOKIE)?.value ?? null
}

export function getReferralFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || ''
  const match = cookieHeader.match(new RegExp(`${REFERRAL_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
