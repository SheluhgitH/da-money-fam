import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserProfile, UserStats, LibraryItem, SongComment } from '@/types/store'
import { getAllOrders, getSongById, linkGuestOrdersToUser } from '@/lib/store'
import { levelFromXp, applyXpMultiplier } from '@/lib/fan-perks'
import { isActiveFanClubMember } from '@/lib/fan-club'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) {
      return {
        id: String(data.id),
        display_name: data.display_name ? String(data.display_name) : null,
        avatar_url: data.avatar_url ? String(data.avatar_url) : null,
        created_at: String(data.created_at),
      }
    }
  }

  const profiles = await readJsonFile<UserProfile[]>('user-profiles.json', [])
  return profiles.find((p) => p.id === userId) || null
}

export async function upsertUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
): Promise<UserProfile> {
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return {
      id: String(data.id),
      display_name: data.display_name ? String(data.display_name) : null,
      avatar_url: data.avatar_url ? String(data.avatar_url) : null,
      created_at: String(data.created_at),
    }
  }

  const profiles = await readJsonFile<UserProfile[]>('user-profiles.json', [])
  const index = profiles.findIndex((p) => p.id === userId)
  const profile: UserProfile = index >= 0
    ? { ...profiles[index], ...updates }
    : { id: userId, display_name: updates.display_name ?? null, avatar_url: updates.avatar_url ?? null, created_at: now }

  if (index >= 0) profiles[index] = profile
  else profiles.push(profile)
  await writeJsonFile('user-profiles.json', profiles)
  return profile
}

export async function ensureUserProfile(userId: string, email?: string): Promise<UserProfile> {
  if (email) {
    await linkGuestOrdersToUser(userId, email)
  }

  const existing = await getUserProfile(userId)
  if (existing) return existing
  const displayName = email ? email.split('@')[0] : 'Fan'
  return upsertUserProfile(userId, { display_name: displayName })
}

export async function getUserStats(userId: string): Promise<UserStats> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('user_stats').select('*').eq('user_id', userId).maybeSingle()
    if (data) {
      return {
        user_id: String(data.user_id),
        xp: Number(data.xp),
        level: Number(data.level),
        streak: Number(data.streak),
        last_login: data.last_login ? String(data.last_login) : null,
      }
    }
  }

  const allStats = await readJsonFile<UserStats[]>('user-stats.json', [])
  const found = allStats.find((s) => s.user_id === userId)
  if (found) return found

  return { user_id: userId, xp: 0, level: 1, streak: 0, last_login: null }
}

export async function saveUserStats(stats: UserStats): Promise<UserStats> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('user_stats')
      .upsert(stats)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return {
      user_id: String(data.user_id),
      xp: Number(data.xp),
      level: Number(data.level),
      streak: Number(data.streak),
      last_login: data.last_login ? String(data.last_login) : null,
    }
  }

  const allStats = await readJsonFile<UserStats[]>('user-stats.json', [])
  const index = allStats.findIndex((s) => s.user_id === stats.user_id)
  if (index >= 0) allStats[index] = stats
  else allStats.push(stats)
  await writeJsonFile('user-stats.json', allStats)
  return stats
}

export async function getUserCoins(userId: string): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('user_coins').select('amount').eq('user_id', userId).maybeSingle()
    return data ? Number(data.amount) : 0
  }

  const coins = await readJsonFile<Record<string, number>>('user-coins.json', {})
  return coins[userId] || 0
}

export async function awardXp(userId: string, amount: number): Promise<UserStats> {
  const current = await getUserStats(userId)
  const fanClub = await isActiveFanClubMember(userId)
  const level = levelFromXp(current.xp)
  const multiplied = applyXpMultiplier(amount, level, fanClub)
  const newXp = current.xp + multiplied
  const newLevel = levelFromXp(newXp)
  return saveUserStats({
    ...current,
    xp: newXp,
    level: newLevel,
  })
}

export type CoinzLedgerReason =
  | 'admin_grant'
  | 'admin_deduct'
  | 'purchase'
  | 'ad_studio'
  | 'refund'
  | 'other'

export interface CoinzLedgerEntry {
  id: string
  user_id: string
  amount: number
  balance_after: number
  reason: string
  reference_id: string | null
  admin_note: string | null
  created_at: string
}

async function writeCoinzLedger(
  userId: string,
  amount: number,
  balanceAfter: number,
  meta?: { reason?: CoinzLedgerReason | string; referenceId?: string; adminNote?: string }
) {
  if (!isSupabaseConfigured()) return
  const supabase = createServiceClient()!
  await supabase.from('coinz_ledger').insert({
    user_id: userId,
    amount,
    balance_after: balanceAfter,
    reason: meta?.reason || 'other',
    reference_id: meta?.referenceId || null,
    admin_note: meta?.adminNote || null,
  })
}

export async function adjustUserCoins(
  userId: string,
  delta: number,
  meta?: { reason?: CoinzLedgerReason | string; referenceId?: string; adminNote?: string }
): Promise<number> {
  if (!delta) throw new Error('Amount must be non-zero')

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data: existing } = await supabase
      .from('user_coins')
      .select('amount')
      .eq('user_id', userId)
      .maybeSingle()

    const current = existing ? Number(existing.amount) : 0
    const next = current + delta
    if (next < 0) throw new Error('Insufficient Coinz')

    const { data, error } = await supabase
      .from('user_coins')
      .upsert({ user_id: userId, amount: next }, { onConflict: 'user_id' })
      .select('amount')
      .single()
    if (error) throw new Error(error.message)

    const balance = Number(data.amount)
    await writeCoinzLedger(userId, delta, balance, meta)
    return balance
  }

  const coins = await readJsonFile<Record<string, number>>('user-coins.json', {})
  const current = coins[userId] || 0
  const next = current + delta
  if (next < 0) throw new Error('Insufficient Coinz')
  coins[userId] = next
  await writeJsonFile('user-coins.json', coins)

  const ledger = await readJsonFile<CoinzLedgerEntry[]>('coinz-ledger.json', [])
  ledger.unshift({
    id: crypto.randomUUID(),
    user_id: userId,
    amount: delta,
    balance_after: next,
    reason: meta?.reason || 'other',
    reference_id: meta?.referenceId || null,
    admin_note: meta?.adminNote || null,
    created_at: new Date().toISOString(),
  })
  await writeJsonFile('coinz-ledger.json', ledger.slice(0, 500))
  return next
}

export async function getCoinzLedger(userId: string, limit = 40): Promise<CoinzLedgerEntry[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('coinz_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('getCoinzLedger:', error.message)
      return []
    }
    return (data || []).map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      amount: Number(row.amount),
      balance_after: Number(row.balance_after),
      reason: String(row.reason),
      reference_id: row.reference_id ? String(row.reference_id) : null,
      admin_note: row.admin_note ? String(row.admin_note) : null,
      created_at: String(row.created_at),
    }))
  }

  const ledger = await readJsonFile<CoinzLedgerEntry[]>('coinz-ledger.json', [])
  return ledger.filter((e) => e.user_id === userId).slice(0, limit)
}

export async function creditUserCoins(
  userId: string,
  amount: number,
  meta?: { reason?: CoinzLedgerReason | string; referenceId?: string; adminNote?: string }
): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive')
  return adjustUserCoins(userId, amount, {
    reason: meta?.reason || 'other',
    referenceId: meta?.referenceId,
    adminNote: meta?.adminNote,
  })
}

export async function debitUserCoins(
  userId: string,
  amount: number,
  meta?: { reason?: CoinzLedgerReason | string; referenceId?: string; adminNote?: string }
): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive')
  return adjustUserCoins(userId, -amount, {
    reason: meta?.reason || 'ad_studio',
    referenceId: meta?.referenceId,
    adminNote: meta?.adminNote,
  })
}

export async function getUserFavorites(userId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('user_favorites').select('song_id').eq('user_id', userId)
    return (data || []).map((row) => String(row.song_id))
  }

  const favorites = await readJsonFile<Record<string, string[]>>('user-favorites.json', {})
  return favorites[userId] || []
}

export async function addFavorite(userId: string, songId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase.from('user_favorites').upsert({ user_id: userId, song_id: songId })
    return
  }

  const favorites = await readJsonFile<Record<string, string[]>>('user-favorites.json', {})
  const list = favorites[userId] || []
  if (!list.includes(songId)) list.push(songId)
  favorites[userId] = list
  await writeJsonFile('user-favorites.json', favorites)
}

export async function removeFavorite(userId: string, songId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase.from('user_favorites').delete().eq('user_id', userId).eq('song_id', songId)
    return
  }

  const favorites = await readJsonFile<Record<string, string[]>>('user-favorites.json', {})
  favorites[userId] = (favorites[userId] || []).filter((id) => id !== songId)
  await writeJsonFile('user-favorites.json', favorites)
}

export async function getUserOwnedSongIds(userId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('purchase_orders')
      .select('song_id')
      .eq('user_id', userId)
      .in('status', ['verified', 'delivered'])
    return (data || []).map((row) => String(row.song_id))
  }

  const orders = await getAllOrders()
  return orders
    .filter((o) => o.user_id === userId && (o.status === 'verified' || o.status === 'delivered'))
    .map((o) => o.song_id)
}

export async function userOwnsSong(userId: string, songId: string): Promise<boolean> {
  const owned = await getUserOwnedSongIds(userId)
  return owned.includes(songId)
}

export async function getUserLibrary(userId: string): Promise<LibraryItem[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('purchase_orders')
      .select('id, song_id, download_token, created_at')
      .eq('user_id', userId)
      .in('status', ['verified', 'delivered'])

    const items: LibraryItem[] = []
    for (const row of data || []) {
      const songId = String(row.song_id)
      const song = await getSongById(songId)
      items.push({
        order_id: String(row.id),
        song_id: songId,
        song_title: song?.title || 'Unknown',
        album_cover_path: song?.album_cover_path || '/store/covers/IMG_8447.PNG',
        download_token: row.download_token ? String(row.download_token) : null,
        purchased_at: String(row.created_at),
      })
    }
    return items
  }

  const orders = await getAllOrders()
  const userOrders = orders.filter(
    (o) =>
      o.user_id === userId &&
      (o.status === 'verified' || o.status === 'delivered')
  )

  const items: LibraryItem[] = []
  for (const order of userOrders) {
    const song = await getSongById(order.song_id)
    items.push({
      order_id: order.id,
      song_id: order.song_id,
      song_title: order.song_title,
      album_cover_path: song?.album_cover_path || '/store/covers/IMG_8447.PNG',
      download_token: order.download_token,
      purchased_at: order.created_at,
    })
  }
  return items
}

export async function getUserAchievements(userId: string): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId)
    return (data || []).map((row) => String(row.achievement_id))
  }

  const all = await readJsonFile<Record<string, string[]>>('user-achievements.json', {})
  return all[userId] || []
}

export async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase.from('user_achievements').upsert({ user_id: userId, achievement_id: achievementId })
    return
  }

  const all = await readJsonFile<Record<string, string[]>>('user-achievements.json', {})
  const list = all[userId] || []
  if (!list.includes(achievementId)) list.push(achievementId)
  all[userId] = list
  await writeJsonFile('user-achievements.json', all)
}

export async function getSongComments(songId: string): Promise<SongComment[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('song_comments')
      .select('id, song_id, user_id, comment_text, created_at')
      .eq('song_id', songId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    const userIds = Array.from(new Set((data || []).map((row) => String(row.user_id))))
    const profileMap = new Map<string, UserProfile>()

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds)

      for (const profile of profiles || []) {
        profileMap.set(String(profile.id), {
          id: String(profile.id),
          display_name: profile.display_name ? String(profile.display_name) : null,
          avatar_url: profile.avatar_url ? String(profile.avatar_url) : null,
          created_at: '',
        })
      }
    }

    return (data || []).map((row) => {
      const profile = profileMap.get(String(row.user_id))
      return {
        id: String(row.id),
        song_id: String(row.song_id),
        user_id: String(row.user_id),
        comment_text: String(row.comment_text),
        created_at: String(row.created_at),
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      }
    })
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const profiles = await readJsonFile<UserProfile[]>('user-profiles.json', [])
  return comments
    .filter((c) => c.song_id === songId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((c) => {
      const profile = profiles.find((p) => p.id === c.user_id)
      return {
        ...c,
        display_name: profile?.display_name ?? c.display_name ?? null,
        avatar_url: profile?.avatar_url ?? c.avatar_url ?? null,
      }
    })
}

export async function addSongComment(
  userId: string,
  songId: string,
  commentText: string
): Promise<SongComment> {
  const trimmed = commentText.trim()
  if (!trimmed || trimmed.length > 500) {
    throw new Error('Comment must be between 1 and 500 characters')
  }

  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('song_comments')
      .insert({ song_id: songId, user_id: userId, comment_text: trimmed })
      .select('id, song_id, user_id, comment_text, created_at')
      .single()
    if (error) throw new Error(error.message)

    const profile = await getUserProfile(userId)
    return {
      id: String(data.id),
      song_id: String(data.song_id),
      user_id: String(data.user_id),
      comment_text: String(data.comment_text),
      created_at: String(data.created_at),
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const profile = await getUserProfile(userId)
  const comment: SongComment = {
    id: `comment-${Date.now()}`,
    song_id: songId,
    user_id: userId,
    comment_text: trimmed,
    created_at: now,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  }
  comments.push(comment)
  await writeJsonFile('song-comments.json', comments)
  return comment
}

export async function deleteSongComment(userId: string, commentId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { error } = await supabase
      .from('song_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const next = comments.filter((c) => !(c.id === commentId && c.user_id === userId))
  if (next.length === comments.length) {
    throw new Error('Comment not found')
  }
  await writeJsonFile('song-comments.json', next)
}

export async function getSongCommentCounts(songIds: string[]): Promise<Record<string, number>> {
  if (songIds.length === 0) return {}

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('song_comments').select('song_id').in('song_id', songIds)
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const id = String(row.song_id)
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const counts: Record<string, number> = {}
  for (const comment of comments) {
    if (songIds.includes(comment.song_id)) {
      counts[comment.song_id] = (counts[comment.song_id] || 0) + 1
    }
  }
  return counts
}

export async function getSongFavoriteCounts(songIds: string[]): Promise<Record<string, number>> {
  if (songIds.length === 0) return {}

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('user_favorites').select('song_id').in('song_id', songIds)
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      const id = String(row.song_id)
      counts[id] = (counts[id] || 0) + 1
    }
    return counts
  }

  const favorites = await readJsonFile<Record<string, string[]>>('user-favorites.json', {})
  const counts: Record<string, number> = {}
  for (const songId of songIds) {
    counts[songId] = 0
  }
  for (const list of Object.values(favorites)) {
    for (const songId of list) {
      if (songIds.includes(songId)) {
        counts[songId] = (counts[songId] || 0) + 1
      }
    }
  }
  return counts
}
