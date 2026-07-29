import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import type { AdStudioGeneration, AdStudioMode, StoryboardScene } from '@/lib/ad-studio-types'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'ad-studio-generations.json')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function readLocal(): Promise<AdStudioGeneration[]> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'))
  } catch {
    return []
  }
}

async function writeLocal(rows: AdStudioGeneration[]) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2))
}

function mapRow(data: Record<string, unknown>): AdStudioGeneration {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    mode: (data.mode as AdStudioMode) || 'single',
    brief: data.brief ? String(data.brief) : null,
    scenes: Array.isArray(data.scenes) ? (data.scenes as StoryboardScene[]) : [],
    creative: (data.creative as Record<string, string>) || null,
    aspect_ratio: String(data.aspect_ratio || '9:16'),
    duration_seconds: Number(data.duration_seconds || 6),
    video_urls: Array.isArray(data.video_urls) ? (data.video_urls as string[]) : [],
    thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : null,
    coinz_spent: Number(data.coinz_spent || 0),
    status: String(data.status || 'completed'),
    created_at: String(data.created_at),
  }
}

export async function listAdStudioGenerations(userId: string, limit = 40): Promise<AdStudioGeneration[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('ad_studio_generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.error('listAdStudioGenerations:', error)
      return []
    }
    return (data || []).map((row) => mapRow(row as Record<string, unknown>))
  }

  const rows = await readLocal()
  return rows
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
}

export async function getAdStudioGeneration(
  userId: string,
  id: string
): Promise<AdStudioGeneration | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('ad_studio_generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    return data ? mapRow(data as Record<string, unknown>) : null
  }

  const rows = await readLocal()
  return rows.find((r) => r.id === id && r.user_id === userId) || null
}

export async function createAdStudioGeneration(input: {
  user_id: string
  mode: AdStudioMode
  brief?: string | null
  scenes?: StoryboardScene[]
  creative?: Record<string, string> | null
  aspect_ratio?: string
  duration_seconds?: number
  video_urls?: string[]
  thumbnail_url?: string | null
  coinz_spent?: number
  status?: string
}): Promise<AdStudioGeneration> {
  const now = new Date().toISOString()
  const row: AdStudioGeneration = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    mode: input.mode,
    brief: input.brief ?? null,
    scenes: input.scenes ?? [],
    creative: input.creative ?? null,
    aspect_ratio: input.aspect_ratio || '9:16',
    duration_seconds: input.duration_seconds || 6,
    video_urls: input.video_urls ?? [],
    thumbnail_url: input.thumbnail_url ?? null,
    coinz_spent: input.coinz_spent ?? 0,
    status: input.status || 'completed',
    created_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('ad_studio_generations')
      .insert({
        id: row.id,
        user_id: row.user_id,
        mode: row.mode,
        brief: row.brief,
        scenes: row.scenes,
        creative: row.creative,
        aspect_ratio: row.aspect_ratio,
        duration_seconds: row.duration_seconds,
        video_urls: row.video_urls,
        thumbnail_url: row.thumbnail_url,
        coinz_spent: row.coinz_spent,
        status: row.status,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return mapRow(data as Record<string, unknown>)
  }

  const rows = await readLocal()
  rows.push(row)
  await writeLocal(rows)
  return row
}

export async function updateAdStudioGeneration(
  userId: string,
  id: string,
  patch: Partial<
    Pick<
      AdStudioGeneration,
      'scenes' | 'video_urls' | 'thumbnail_url' | 'status' | 'coinz_spent' | 'brief'
    >
  >
): Promise<AdStudioGeneration | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('ad_studio_generations')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle()
    if (error) {
      console.error('updateAdStudioGeneration:', error)
      return null
    }
    return data ? mapRow(data as Record<string, unknown>) : null
  }

  const rows = await readLocal()
  const idx = rows.findIndex((r) => r.id === id && r.user_id === userId)
  if (idx < 0) return null
  rows[idx] = { ...rows[idx], ...patch }
  await writeLocal(rows)
  return rows[idx]
}
