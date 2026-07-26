import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats, saveUserStats, unlockAchievement } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import {
  calculateCheckInXp,
  checkInStreakBonus,
  levelFromXp,
  getEntitlements,
  type PerkId,
} from '@/lib/fan-perks'

function isYesterday(lastLogin: string | null): boolean {
  if (!lastLogin) return false
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toDateString() === lastLogin && lastLogin !== today
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const current = await getUserStats(user.id)
    const today = new Date().toDateString()

    if (current.last_login === today) {
      return NextResponse.json({
        stats: current,
        leveledUp: false,
        unlockedPerks: [] as PerkId[],
        alreadyClaimed: true,
      })
    }

    const fanClub = await isActiveFanClubMember(user.id)
    const level = levelFromXp(current.xp)
    const continuing = isYesterday(current.last_login)
    const streakBefore = continuing ? current.streak : 0
    const streak = streakBefore + 1
    const bonus = checkInStreakBonus(level, fanClub)
    const xpGain = calculateCheckInXp(streakBefore, level, fanClub)
    const newXp = current.xp + xpGain
    const newLevel = levelFromXp(newXp)
    const leveledUp = newLevel > level

    const stats = await saveUserStats({
      ...current,
      xp: newXp,
      level: newLevel,
      streak,
      last_login: today,
    })

    let unlockedPerks: PerkId[] = []
    if (leveledUp) {
      unlockedPerks = getEntitlements(newLevel, fanClub).filter(
        (p) => !getEntitlements(level, fanClub).includes(p)
      )
      for (const perk of unlockedPerks) {
        await unlockAchievement(user.id, `perk_${perk}`).catch(() => {})
      }
      if (newLevel >= 2) await unlockAchievement(user.id, 'fam_regular').catch(() => {})
    }

    return NextResponse.json({
      stats,
      xp_gain: xpGain,
      streak_bonus: bonus,
      leveledUp,
      unlockedPerks,
      alreadyClaimed: false,
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Check-in failed' },
      { status: 500 }
    )
  }
}
