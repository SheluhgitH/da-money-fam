import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { listReferralsForReferrer } from '@/lib/referrals-store'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const referrals = await listReferralsForReferrer(user.id)
    const rewarded = referrals.filter((r) => r.status === 'rewarded').length
    const pending = referrals.filter((r) => r.status === 'pending').length

    return NextResponse.json({
      total: referrals.length,
      rewarded,
      pending,
      referrals: referrals.map((r) => ({
        id: r.id,
        buyer_email: r.buyer_email,
        status: r.status,
        created_at: r.created_at,
      })),
    })
  } catch (error) {
    console.error('Referrals list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load referrals' },
      { status: 500 }
    )
  }
}
