import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function verifySecret(req: Request): boolean {
  const secret = process.env.N8N_BLOG_INGEST_SECRET
  if (!secret) return false

  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false

  return auth.slice(7) === secret
}

export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const slug = normalizeSlug(String(body.slug || ''))
    const title = String(body.title || '').trim()
    const excerpt = String(body.excerpt || '').trim()
    const content = String(body.content || '').trim()
    const cover_image_url = body.cover_image_url ? String(body.cover_image_url) : null
    const is_published = Boolean(body.is_published)

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: 'slug, title, and content are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    const row = {
      slug,
      title,
      excerpt: excerpt || content.slice(0, 160),
      content,
      cover_image_url,
      is_published,
      published_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(row, { onConflict: 'slug' })
      .select('id, slug, is_published')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { ok: true, post: data, updated: Boolean(existing) },
      { status: existing ? 200 : 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
