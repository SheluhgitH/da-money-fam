import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { promises as fs } from 'fs'
import path from 'path'
import type { UserProfile, UserStats } from '@/types/store'
import { levelFromXp } from '@/lib/fan-perks'

export const dynamic = 'force-dynamic'

type Spotlight = {
  display_name: string
  avatar_url: string | null
  level: number
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
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', userIds)

        const profileMap = new Map(
          (profiles || []).map((p) => [String(p.id), p])
        )

        for (const row of eligible) {
          const profile = profileMap.get(String(row.user_id))
          const name = profile?.display_name ? String(profile.display_name).trim() : ''
          if (!name) continue
          spotlights.push({
            display_name: name,
            avatar_url: profile?.avatar_url ? String(profile.avatar_url) : null,
            level: Number(row.level) || levelFromXp(Number(row.xp) || 0),
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

      for (const s of eligible) {
        const profile = profiles.find((p) => p.id === s.user_id)
        const name = profile?.display_name?.trim()
        if (!name) continue
        spotlights.push({
          display_name: name,
          avatar_url: profile?.avatar_url ?? null,
          level: s.level,
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
