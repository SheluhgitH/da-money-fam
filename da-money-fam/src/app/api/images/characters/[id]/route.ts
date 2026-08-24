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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.style_id === 'string' && CHARACTER_STYLES.some((s) => s.id === body.style_id)) {
    patch.style_id = body.style_id
  }
  if (typeof body.prompt === 'string') patch.prompt = body.prompt.trim() || null
  if (Array.isArray(body.sheet_urls)) {
    patch.sheet_urls = body.sheet_urls.filter(
      (u: unknown): u is string => typeof u === 'string' && u.length > 0
    )
  }
  if (Array.isArray(body.ref_urls)) {
    patch.ref_urls = body.ref_urls.filter(
      (u: unknown): u is string => typeof u === 'string' && u.length > 0
    )
  }
  if (body.primary_url === null || typeof body.primary_url === 'string') {
    patch.primary_url = body.primary_url
  }

  const { data, error } = await supabase
    .from('ad_studio_characters')
    .update(patch)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ item: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const { error } = await supabase
    .from('ad_studio_characters')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
