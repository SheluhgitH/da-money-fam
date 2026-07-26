import { PREVIEW_DURATION_SEC, FAN_CLUB_PREVIEW_DURATION_SEC } from '@/lib/audio-constants'

export const XP_PER_LEVEL = 2000
export const LEVEL3_DISCOUNT_PERCENT = 10
export const EARLY_ACCESS_DAYS = 3
export const WEEKEND_XP_MULTIPLIER = 2
export const BASE_STREAK_BONUS = 0.1
export const L4_STREAK_BONUS = 0.2
export const BASE_CHECK_IN_XP = 500

export type PerkStatus = 'live' | 'soon'

export type PerkItem = {
  label: string
  status: PerkStatus
}

export type FanPerkTier = {
  level: number
  title: string
  xpRequired: number
  perks: PerkItem[]
}

export type PerkId =
  | 'badge'
  | 'fam_wall'
  | 'song_discount'
  | 'priority_comments'
  | 'bonus_xp_weekends'
  | 'streak_multiplier'
  | 'early_access'
  | 'exclusive_content'
  | 'presale'

export const FAN_PERK_TIERS: FanPerkTier[] = [
  {
    level: 1,
    title: 'New Fan',
    xpRequired: 0,
    perks: [
      { label: `${PREVIEW_DURATION_SEC}s song previews`, status: 'live' },
      { label: 'Daily XP check-ins', status: 'live' },
      { label: 'Earn XP from favorites & comments', status: 'live' },
    ],
  },
  {
    level: 2,
    title: 'Fam Regular',
    xpRequired: XP_PER_LEVEL,
    perks: [
      { label: 'Fam badge on your profile', status: 'live' },
      { label: 'Shout-out in the Fam wall', status: 'live' },
    ],
  },
  {
    level: 3,
    title: 'Loyal Supporter',
    xpRequired: XP_PER_LEVEL * 2,
    perks: [
      { label: `${LEVEL3_DISCOUNT_PERCENT}% off song purchases`, status: 'live' },
      { label: 'Priority comments reply spot', status: 'live' },
    ],
  },
  {
    level: 4,
    title: 'Day-One Rider',
    xpRequired: XP_PER_LEVEL * 3,
    perks: [
      { label: 'Bonus XP weekends', status: 'live' },
      { label: 'Streak multiplier bump', status: 'live' },
    ],
  },
  {
    level: 5,
    title: 'Inner Circle',
    xpRequired: XP_PER_LEVEL * 4,
    perks: [
      { label: 'Early access to new drops', status: 'live' },
      { label: 'Exclusive fam-only content', status: 'live' },
    ],
  },
]

export const FAN_CLUB_PRICE_MONTHLY = 9

export type FanClubPerk = {
  label: string
  status: PerkStatus
}

export const FAN_CLUB_PERKS: FanClubPerk[] = [
  { label: `${FAN_CLUB_PREVIEW_DURATION_SEC}s song previews`, status: 'live' },
  { label: 'Every XP level perk unlocked', status: 'live' },
  { label: 'Early access to new drops', status: 'live' },
  { label: 'Exclusive behind-the-scenes content', status: 'live' },
  { label: 'Merch & event presales', status: 'live' },
]

export const LEVEL_PERK_MAP: Record<number, PerkId[]> = {
  1: [],
  2: ['badge', 'fam_wall'],
  3: ['song_discount', 'priority_comments'],
  4: ['bonus_xp_weekends', 'streak_multiplier'],
  5: ['early_access', 'exclusive_content', 'presale'],
}

export function canAccessPerk(level: number, fanClub: boolean, perkId: PerkId): boolean {
  for (let l = 1; l <= 5; l++) {
    if (LEVEL_PERK_MAP[l]?.includes(perkId)) {
      return level >= l || fanClub
    }
  }
  return fanClub
}

export function getEntitlements(level: number, fanClub: boolean): PerkId[] {
  if (fanClub) {
    return Object.values(LEVEL_PERK_MAP).flat()
  }
  const perks: PerkId[] = []
  for (let l = 2; l <= 5; l++) {
    if (level >= l) perks.push(...LEVEL_PERK_MAP[l])
  }
  return perks
}

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpProgressToNextLevel(xp: number): {
  currentLevel: number
  nextLevel: number
  progress: number
  xpIntoLevel: number
  xpNeededForNext: number
} {
  const currentLevel = levelFromXp(xp)
  const xpIntoLevel = xp % XP_PER_LEVEL
  const xpNeededForNext = xpForLevel(currentLevel + 1) - xp
  const progress = xpIntoLevel / XP_PER_LEVEL
  return { currentLevel, nextLevel: currentLevel + 1, progress, xpIntoLevel, xpNeededForNext }
}

export function getTierForLevel(level: number): FanPerkTier | undefined {
  return FAN_PERK_TIERS.find((t) => t.level === level)
}

export function isWeekend(date = new Date()): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function applyXpMultiplier(
  amount: number,
  level: number,
  fanClub: boolean,
  date = new Date()
): number {
  let multiplier = 1
  if (canAccessPerk(level, fanClub, 'bonus_xp_weekends') && isWeekend(date)) {
    multiplier *= WEEKEND_XP_MULTIPLIER
  }
  return amount * multiplier
}

export function checkInStreakBonus(level: number, fanClub: boolean): number {
  if (fanClub || canAccessPerk(level, fanClub, 'streak_multiplier')) {
    return L4_STREAK_BONUS
  }
  return BASE_STREAK_BONUS
}

export function calculateCheckInXp(
  streak: number,
  level: number,
  fanClub: boolean,
  date = new Date()
): number {
  const bonus = checkInStreakBonus(level, fanClub)
  const base = BASE_CHECK_IN_XP * (1 + streak * bonus)
  return applyXpMultiplier(base, level, fanClub, date)
}

export type SongAccess = 'public' | 'early' | 'exclusive'

export type SongWithAccess = {
  access?: SongAccess
  release_date?: string
  for_sale?: boolean
}

export function hasEarlyAccessToSong(
  song: SongWithAccess,
  now: Date,
  level: number,
  fanClub: boolean
): boolean {
  if (song.access !== 'early') return false
  if (!song.release_date) return false
  if (!canAccessPerk(level, fanClub, 'early_access')) return false
  const release = new Date(song.release_date + 'T00:00:00')
  const early = new Date(release)
  early.setDate(early.getDate() - EARLY_ACCESS_DAYS)
  return now >= early && now < release
}

export function canPurchaseSong(
  song: SongWithAccess,
  now: Date,
  level: number,
  fanClub: boolean
): boolean {
  if (!song.for_sale && song.access !== 'early' && song.access !== 'exclusive') return false

  if (song.access === 'exclusive') {
    return canAccessPerk(level, fanClub, 'exclusive_content')
  }

  if (song.access === 'early') {
    if (song.for_sale) return true
    return hasEarlyAccessToSong(song, now, level, fanClub)
  }

  return song.for_sale === true
}

export function canPreviewSong(
  song: SongWithAccess,
  level: number,
  fanClub: boolean
): boolean {
  if (song.access !== 'exclusive') return true
  return canAccessPerk(level, fanClub, 'exclusive_content')
}

export function unlockedPerkLabels(level: number, fanClub: boolean): PerkItem[] {
  const perks: PerkItem[] = []
  for (const tier of FAN_PERK_TIERS) {
    if (tier.level <= level || fanClub) {
      perks.push(...tier.perks.filter((p) => p.status === 'live'))
    }
  }
  if (fanClub) {
    perks.push(...FAN_CLUB_PERKS.filter((p) => p.status === 'live'))
  }
  return perks
}

export function newlyUnlockedPerkLabels(prevLevel: number, nextLevel: number, fanClub: boolean): PerkItem[] {
  if (fanClub && prevLevel < 5) {
    return Object.values(LEVEL_PERK_MAP).flat().map((id) => {
      const tier = FAN_PERK_TIERS.find((t) => t.perks.some((p) => p.label.toLowerCase().includes(id.replace(/_/g, ' '))))
      const perk = tier?.perks.find((p) => p.status === 'live')
      return perk || { label: id, status: 'live' as PerkStatus }
    })
  }
  const perks: PerkItem[] = []
  for (let l = prevLevel + 1; l <= nextLevel; l++) {
    const tier = getTierForLevel(l)
    if (tier) perks.push(...tier.perks.filter((p) => p.status === 'live'))
  }
  return perks
}
