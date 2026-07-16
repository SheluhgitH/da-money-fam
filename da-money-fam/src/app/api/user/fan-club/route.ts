import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getFanSubscription, isActiveFanClubMember } from '@/lib/fan-club'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ active: false, subscription: null })
  }

  const sub = await getFanSubscription(user.id)
  const active = await isActiveFanClubMember(user.id)

  return NextResponse.json({
    active,
    subscription: sub
      ? {
          status: sub.status,
          current_period_end: sub.current_period_end,
        }
      : null,
  })
}
