import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = params
  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    return NextResponse.json({ error: 'OpenRouter API Key not configured' }, { status: 500 })
  }

  try {
    const upstream = await fetch(
      `https://openrouter.ai/api/v1/videos/${jobId}/content?index=0`,
      {
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
        },
        redirect: 'follow',
      }
    )

    if (!upstream.ok) {
      const detail = await upstream.text()
      console.error('OpenRouter content fetch failed:', upstream.status, detail)
      return NextResponse.json(
        { error: 'Failed to fetch video content', details: detail },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'
    const contentLength = upstream.headers.get('content-length')

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="dmf-ad-${jobId}.mp4"`,
    })
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Video content proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
