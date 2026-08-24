import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/user'
import type { AdStudioPreset } from '@/lib/ad-studio-types'

export const dynamic = 'force-dynamic'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function mapPreset(row: Record<string, unknown>): AdStudioPreset {
  const creative = (row.creative as Record<string, string>) || null
  const lookFromCreative = creative?.lookRefUrls
    ? creative.lookRefUrls.split('|').filter(Boolean)
    : []
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    brief: row.brief ? String(row.brief) : null,
    creative,
    aspect_ratio: String(row.aspect_ratio || '9:16'),
    model: row.model ? String(row.model) : null,
    duration_seconds: Number(row.duration_seconds || 6),
    look_ref_urls: Array.isArray(row.look_ref_urls)
      ? (row.look_ref_urls as unknown[]).filter((u): u is string => typeof u === 'string')
      : lookFromCreative,
    look_character_id:
      typeof row.look_character_id === 'string'
        ? row.look_character_id
        : creative?.lookCharacterId || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ presets: [] })

  const { data, error } = await supabase
    .from('ad_studio_presets')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(40)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: (data || []).map((r) => mapPreset(r as Record<string, unknown>)) })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const body = await req.json()
  const name = String(body.name || 'Saved look').trim().slice(0, 80)
  const now = new Date().toISOString()

  const lookRefUrls = Array.isArray(body.look_ref_urls)
    ? (body.look_ref_urls as unknown[]).filter((u): u is string => typeof u === 'string').slice(0, 4)
    : []
  const lookCharacterId =
    typeof body.look_character_id === 'string' ? body.look_character_id.slice(0, 80) : ''
  const creativePayload = {
    ...(body.creative && typeof body.creative === 'object' ? body.creative : {}),
    ...(lookRefUrls.length ? { lookRefUrls: lookRefUrls.join('|') } : {}),
    ...(lookCharacterId ? { lookCharacterId } : {}),
  }

  const { data, error } = await supabase
    .from('ad_studio_presets')
    .insert({
      user_id: user.id,
      name,
      brief: body.brief || null,
      creative: creativePayload,
      aspect_ratio: body.aspect_ratio || '9:16',
      model: body.model || null,
      duration_seconds: Number(body.duration_seconds) || 6,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset: mapPreset(data as Record<string, unknown>) })
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('ad_studio_presets').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
