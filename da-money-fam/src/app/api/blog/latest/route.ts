import { NextResponse } from 'next/server'
import { getLatestPost } from '@/lib/blog/posts'
import { getReadingTimeMinutes } from '@/lib/blog/shared'

export const dynamic = 'force-dynamic'

export async function GET() {
  const post = await getLatestPost()
  if (!post) {
    return NextResponse.json({ post: null })
  }

  return NextResponse.json({
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      published_at: post.published_at,
      reading_time_minutes: getReadingTimeMinutes(post.content),
    },
  })
}
