import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { type BlogPost } from '@/lib/blog/shared'

export type { BlogPost } from '@/lib/blog/shared'

function mapRow(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt),
    content: String(row.content),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    is_published: Boolean(row.is_published),
    published_at: String(row.published_at),
    created_at: String(row.created_at),
  }
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = createServiceClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getPublishedPosts:', error.message)
    return []
  }

  return (data || []).map(mapRow)
}

export async function getLatestPost(): Promise<BlogPost | null> {
  const posts = await getPublishedPosts()
  return posts[0] ?? null
}

export async function getRelatedPosts(slug: string, limit = 2): Promise<BlogPost[]> {
  const posts = await getPublishedPosts()
  return posts.filter((p) => p.slug !== slug).slice(0, limit)
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) return null
  return mapRow(data)
}
