import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { UserProfile, UserStats } from '@/types/store'
import { levelFromXp } from '@/lib/fan-perks'
import { getActiveCosmeticsForUsers } from '@/lib/user-store'

export const dynamic = 'force-dynamic'

type Spotlight = {
  display_name: string
  avatar_url: string | null
  level: number
  active_cosmetics: string[]
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', filename), 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function GET() {
  try {
    const spotlights: Spotlight[] = []

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient()!
      const { data: statsRows } = await supabase
        .from('user_stats')
        .select('user_id, xp, level')
        .order('xp', { ascending: false })
        .limit(40)

      const eligible = (statsRows || []).filter((row) => {
        const level = Number(row.level) || levelFromXp(Number(row.xp) || 0)
        return level >= 2
      })

      const userIds = eligible.map((r) => String(r.user_id))
      if (userIds.length > 0) {
        const [{ data: profiles }, cosmeticsMap] = await Promise.all([
          supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
          getActiveCosmeticsForUsers(userIds),
        ])

        const profileMap = new Map((profiles || []).map((p) => [String(p.id), p]))

        for (const row of eligible) {
          const uid = String(row.user_id)
          const profile = profileMap.get(uid)
          const name = profile?.display_name ? String(profile.display_name).trim() : ''
          if (!name) continue
          spotlights.push({
            display_name: name,
            avatar_url: profile?.avatar_url ? String(profile.avatar_url) : null,
            level: Number(row.level) || levelFromXp(Number(row.xp) || 0),
            active_cosmetics: cosmeticsMap.get(uid) || [],
          })
          if (spotlights.length >= 8) break
        }
      }
    } else {
      const statsAll = await readJsonFile<UserStats[]>('user-stats.json', [])
      const profiles = await readJsonFile<UserProfile[]>('user-profiles.json', [])
      const eligible = statsAll
        .map((s) => ({ ...s, level: levelFromXp(s.xp) }))
        .filter((s) => s.level >= 2)
        .sort((a, b) => b.xp - a.xp)

      const cosmeticsMap = await getActiveCosmeticsForUsers(eligible.map((s) => s.user_id))

      for (const s of eligible) {
        const profile = profiles.find((p) => p.id === s.user_id)
        const name = profile?.display_name?.trim()
        if (!name) continue
        spotlights.push({
          display_name: name,
          avatar_url: profile?.avatar_url ?? null,
          level: s.level,
          active_cosmetics: cosmeticsMap.get(s.user_id) || [],
        })
        if (spotlights.length >= 8) break
      }
    }

    return NextResponse.json({ spotlights })
  } catch (error) {
    console.error('Spotlights error:', error)
    return NextResponse.json({ spotlights: [] })
  }
}
