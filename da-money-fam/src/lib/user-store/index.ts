import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import type { UserProfile, UserStats, LibraryItem } from '@/types/store'
import { getAllOrders, getSongById } from '@/lib/store'

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
  console.log('ensureUserProfile called with userId:', userId, 'email:', email, 'isSupabaseConfigured:', isSupabaseConfigured());
  const existing = await getUserProfile(userId)
    console.log('ensureUserProfile - existing profile:', existing);
  if (existing) return existing
  const displayName = email ? email.split('@')[0] : 'Fan'
  console.log('ensureUserProfile - creating new profile with displayName:', displayName);
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

export async function creditUserCoins(userId: string, amount: number): Promise<number> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('user_coins')
      .upsert({ user_id: userId, amount: amount }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select('amount')
      .single()
    if (error) throw new Error(error.message)
    return Number(data.amount)
  }

  const coins = await readJsonFile<Record<string, number>>('user-coins.json', {})
  coins[userId] = (coins[userId] || 0) + amount
  await writeJsonFile('user-coins.json', coins)
  return coins[userId]
}

export async function debitUserCoins(userId: string, amount: number): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive')

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data: existing } = await supabase
      .from('user_coins')
      .select('amount')
      .eq('user_id', userId)
      .maybeSingle()

    const currentAmount = existing ? Number(existing.amount) : 0
    if (currentAmount < amount) {
      throw new Error('Insufficient Coinz')
    }

    const nextAmount = currentAmount - amount
    const { data, error } = await supabase
      .from('user_coins')
      .upsert({ user_id: userId, amount: nextAmount }, { onConflict: 'user_id', ignoreDuplicates: false })
      .select('amount')
      .single()

    if (error) throw new Error(error.message)
    return Number(data.amount)
  }

  const coins = await readJsonFile<Record<string, number>>('user-coins.json', {})
  const currentAmount = coins[userId] || 0
  if (currentAmount < amount) {
    throw new Error('Insufficient Coinz')
  }
  coins[userId] = currentAmount - amount
  await writeJsonFile('user-coins.json', coins)
  return coins[userId]
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
