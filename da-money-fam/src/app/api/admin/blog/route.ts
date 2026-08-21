import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminAuthenticated } from '@/lib/auth'
import { writeAdminAudit } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = service()
  if (!supabase) return NextResponse.json({ posts: [] })

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data || [] })
}

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const body = await req.json()
  const title = String(body.title || '').trim()
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const slug = String(body.slug || slugify(title)).trim()
  const now = new Date().toISOString()
  const row = {
    slug,
    title,
    excerpt: String(body.excerpt || '').trim(),
    content: String(body.content || '').trim(),
    cover_image_url: body.cover_image_url || null,
    is_published: Boolean(body.is_published),
    published_at: body.is_published ? now : now,
    created_at: now,
  }

  const { data, error } = await supabase.from('blog_posts').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAudit({ action: 'create', entity: 'blog_post', entityId: data.id, payload: { slug } })
  return NextResponse.json({ post: data })
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const body = await req.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string') patch.title = body.title.trim()
  if (typeof body.slug === 'string') patch.slug = body.slug.trim()
  if (typeof body.excerpt === 'string') patch.excerpt = body.excerpt.trim()
  if (typeof body.content === 'string') patch.content = body.content.trim()
  if (typeof body.cover_image_url === 'string' || body.cover_image_url === null) {
    patch.cover_image_url = body.cover_image_url
  }
  if (typeof body.is_published === 'boolean') {
    patch.is_published = body.is_published
    if (body.is_published) patch.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase.from('blog_posts').update(patch).eq('id', id).select('*').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await writeAdminAudit({ action: 'patch', entity: 'blog_post', entityId: id, payload: Object.keys(patch) })
  return NextResponse.json({ post: data })
}

export async function DELETE(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = service()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await writeAdminAudit({ action: 'delete', entity: 'blog_post', entityId: id })
  return NextResponse.json({ ok: true })
}
