import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/user'
import { CHARACTER_STYLES } from '@/lib/character-styles'

export const dynamic = 'force-dynamic'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function validStyle(id: unknown): string {
  const s = typeof id === 'string' ? id : ''
  return CHARACTER_STYLES.some((x) => x.id === s) ? s : 'photoreal'
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ items: [] })

  const { data, error } = await supabase
    .from('ad_studio_characters')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('characters list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const refUrls = Array.isArray(body.ref_urls)
    ? body.ref_urls.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
    : []

  const { data, error } = await supabase
    .from('ad_studio_characters')
    .insert({
      user_id: user.id,
      name,
      style_id: validStyle(body.style_id),
      prompt: prompt || null,
      ref_urls: refUrls,
      sheet_urls: [],
      primary_url: null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('characters create:', error)
    return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 })
  }

  return NextResponse.json({ item: data })
}
