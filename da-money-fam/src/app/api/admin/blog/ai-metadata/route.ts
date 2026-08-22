import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateBlogPostFromTitle } from '@/lib/blog-ai'
import { isOpenRouterConfigured } from '@/lib/chat-models'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'OpenRouter API Key not configured' },
      { status: 503 }
    )
  }

  const rate = checkRateLimit('admin-blog-ai-metadata', 20, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const title = String(body.title || '').trim()
    if (!title) {
      return NextResponse.json({ error: 'Blog title is required' }, { status: 400 })
    }

    const metadata = await generateBlogPostFromTitle({ title })
    return NextResponse.json(metadata)
  } catch (error) {
    console.error('POST /api/admin/blog/ai-metadata:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate blog content' },
      { status: 500 }
    )
  }
}
