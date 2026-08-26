import { NextResponse } from 'next/server'
import { getPublishedPosts } from '@/lib/blog/posts'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() || ''
  const posts = await getPublishedPosts()
  const matched = (q
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
      )
    : posts
  ).slice(0, 6)

  return NextResponse.json({
    posts: matched.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt.slice(0, 180),
    })),
  })
}
