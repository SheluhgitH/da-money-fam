import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { getEntitlements, levelFromXp } from '@/lib/fan-perks'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await getUserStats(user.id)
    const fanClub = await isActiveFanClubMember(user.id)
    const level = levelFromXp(stats.xp)
    const perks = getEntitlements(level, fanClub)

    return NextResponse.json({
      user_id: user.id,
      xp: stats.xp,
      level,
      streak: stats.streak,
      last_login: stats.last_login,
      fan_club: fanClub,
      perks,
    })
  } catch (error) {
    console.error('Entitlements error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load entitlements' },
      { status: 500 }
    )
  }
}
