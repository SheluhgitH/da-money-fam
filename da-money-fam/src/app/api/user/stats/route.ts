import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats, saveUserStats, unlockAchievement } from '@/lib/user-store'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await getUserStats(user.id)
  return NextResponse.json({ stats })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const current = await getUserStats(user.id)

    const stats = await saveUserStats({
      user_id: user.id,
      xp: body.xp ?? current.xp,
      level: body.level ?? current.level,
      streak: body.streak ?? current.streak,
      last_login: body.last_login ?? current.last_login,
    })

    if (body.unlock_achievement) {
      await unlockAchievement(user.id, body.unlock_achievement)
    }

    return NextResponse.json({ stats })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update stats' },
      { status: 400 }
    )
  }
}
