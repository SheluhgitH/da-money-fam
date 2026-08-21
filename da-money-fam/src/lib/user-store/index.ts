import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserProfile, UserStats, LibraryItem, SongComment, UserCosmetic } from '@/types/store'
import { getAllOrders, getSongById, linkGuestOrdersToUser } from '@/lib/store'
import { levelFromXp, applyXpMultiplier } from '@/lib/fan-perks'
import { isActiveFanClubMember } from '@/lib/fan-club'
import {
  isCosmeticSlug,
  sanitizeGiftMessage,
  type CosmeticSlug,
} from '@/lib/profile-cosmetics'

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
    const cosmeticsMap = await getActiveCosmeticsForUsers(userIds)

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
        active_cosmetics: cosmeticsMap.get(String(row.user_id)) || [],
      }
    })
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const profiles = await readJsonFile<UserProfile[]>('user-profiles.json', [])
  const cosmeticsMap = await getActiveCosmeticsForUsers(
    comments.filter((c) => c.song_id === songId).map((c) => c.user_id)
  )
  return comments
    .filter((c) => c.song_id === songId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((c) => {
      const profile = profiles.find((p) => p.id === c.user_id)
      return {
        ...c,
        display_name: profile?.display_name ?? c.display_name ?? null,
        avatar_url: profile?.avatar_url ?? c.avatar_url ?? null,
        active_cosmetics: cosmeticsMap.get(c.user_id) || [],
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
    const cosmeticsMap = await getActiveCosmeticsForUsers([userId])
    return {
      id: String(data.id),
      song_id: String(data.song_id),
      user_id: String(data.user_id),
      comment_text: String(data.comment_text),
      created_at: String(data.created_at),
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      active_cosmetics: cosmeticsMap.get(userId) || [],
    }
  }

  const comments = await readJsonFile<SongComment[]>('song-comments.json', [])
  const profile = await getUserProfile(userId)
  const cosmeticsMap = await getActiveCosmeticsForUsers([userId])
  const comment: SongComment = {
    id: `comment-${Date.now()}`,
    song_id: songId,
    user_id: userId,
    comment_text: trimmed,
    created_at: now,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
    active_cosmetics: cosmeticsMap.get(userId) || [],
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

function mapCosmeticRow(row: Record<string, unknown>): UserCosmetic {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    cosmetic_slug: String(row.cosmetic_slug),
    enabled: Boolean(row.enabled),
    revealed_at: row.revealed_at ? String(row.revealed_at) : null,
    granted_at: String(row.granted_at),
    granted_by: row.granted_by ? String(row.granted_by) : null,
    admin_note: row.admin_note ? String(row.admin_note) : null,
    gift_message: row.gift_message ? String(row.gift_message) : null,
  }
}

export async function getUserCosmetics(userId: string): Promise<UserCosmetic[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('user_profile_cosmetics')
      .select('*')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => mapCosmeticRow(row as Record<string, unknown>))
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  return all
    .filter((c) => c.user_id === userId)
    .sort((a, b) => new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime())
}

export async function getActiveCosmeticsForUsers(
  userIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (userIds.length === 0) return map

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('user_profile_cosmetics')
      .select('user_id, cosmetic_slug')
      .in('user_id', userIds)
      .eq('enabled', true)

    for (const row of data || []) {
      const uid = String(row.user_id)
      const list = map.get(uid) || []
      list.push(String(row.cosmetic_slug))
      map.set(uid, list)
    }
    return map
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  for (const c of all) {
    if (!c.enabled || !userIds.includes(c.user_id)) continue
    const list = map.get(c.user_id) || []
    list.push(c.cosmetic_slug)
    map.set(c.user_id, list)
  }
  return map
}

export async function grantCosmetic(
  userId: string,
  slug: CosmeticSlug,
  opts?: {
    giftMessage?: string | null
    adminNote?: string | null
    grantedBy?: string | null
  }
): Promise<UserCosmetic> {
  if (!isCosmeticSlug(slug)) throw new Error('Invalid cosmetic slug')
  const giftMessage = sanitizeGiftMessage(opts?.giftMessage ?? null)
  const adminNote =
    typeof opts?.adminNote === 'string' && opts.adminNote.trim()
      ? opts.adminNote.trim().slice(0, 500)
      : null
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('user_profile_cosmetics')
      .upsert(
        {
          user_id: userId,
          cosmetic_slug: slug,
          enabled: true,
          revealed_at: null,
          granted_at: now,
          granted_by: opts?.grantedBy || null,
          admin_note: adminNote,
          gift_message: giftMessage,
        },
        { onConflict: 'user_id,cosmetic_slug' }
      )
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapCosmeticRow(data as Record<string, unknown>)
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  const index = all.findIndex((c) => c.user_id === userId && c.cosmetic_slug === slug)
  const row: UserCosmetic = {
    id: index >= 0 ? all[index].id : `cosmetic-${Date.now()}`,
    user_id: userId,
    cosmetic_slug: slug,
    enabled: true,
    revealed_at: null,
    granted_at: now,
    granted_by: opts?.grantedBy || null,
    admin_note: adminNote,
    gift_message: giftMessage,
  }
  if (index >= 0) all[index] = row
  else all.push(row)
  await writeJsonFile('user-cosmetics.json', all)
  return row
}

export async function revokeCosmetic(userId: string, slug: CosmeticSlug): Promise<void> {
  if (!isCosmeticSlug(slug)) throw new Error('Invalid cosmetic slug')

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { error } = await supabase
      .from('user_profile_cosmetics')
      .delete()
      .eq('user_id', userId)
      .eq('cosmetic_slug', slug)
    if (error) throw new Error(error.message)
    return
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  await writeJsonFile(
    'user-cosmetics.json',
    all.filter((c) => !(c.user_id === userId && c.cosmetic_slug === slug))
  )
}

export async function setCosmeticEnabled(
  userId: string,
  slug: CosmeticSlug,
  enabled: boolean
): Promise<UserCosmetic> {
  if (!isCosmeticSlug(slug)) throw new Error('Invalid cosmetic slug')

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('user_profile_cosmetics')
      .update({ enabled })
      .eq('user_id', userId)
      .eq('cosmetic_slug', slug)
      .select('*')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Cosmetic not found')
    return mapCosmeticRow(data as Record<string, unknown>)
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  const index = all.findIndex((c) => c.user_id === userId && c.cosmetic_slug === slug)
  if (index < 0) throw new Error('Cosmetic not found')
  all[index] = { ...all[index], enabled }
  await writeJsonFile('user-cosmetics.json', all)
  return all[index]
}

export async function markCosmeticRevealed(
  userId: string,
  slugs: CosmeticSlug[],
  opts?: { enable?: boolean }
): Promise<void> {
  const unique = Array.from(new Set(slugs.filter(isCosmeticSlug)))
  if (unique.length === 0) return
  const now = new Date().toISOString()
  const enable = opts?.enable

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const patch: Record<string, unknown> = { revealed_at: now }
    if (typeof enable === 'boolean') patch.enabled = enable
    const { error } = await supabase
      .from('user_profile_cosmetics')
      .update(patch)
      .eq('user_id', userId)
      .in('cosmetic_slug', unique)
      .is('revealed_at', null)
    if (error) throw new Error(error.message)
    return
  }

  const all = await readJsonFile<UserCosmetic[]>('user-cosmetics.json', [])
  let changed = false
  for (let i = 0; i < all.length; i++) {
    const c = all[i]
    if (c.user_id !== userId || !unique.includes(c.cosmetic_slug as CosmeticSlug)) continue
    if (c.revealed_at) continue
    all[i] = {
      ...c,
      revealed_at: now,
      ...(typeof enable === 'boolean' ? { enabled: enable } : {}),
    }
    changed = true
  }
  if (changed) await writeJsonFile('user-cosmetics.json', all)
}
