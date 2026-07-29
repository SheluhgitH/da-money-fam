import { NextResponse } from 'next/server'
import { getAdStudioGenerationById } from '@/lib/ad-studio-jobs'
import { extractOpenRouterJobId } from '@/lib/seedance-models'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const gen = await getAdStudioGenerationById(id)
  if (
    !gen ||
    gen.featured === false ||
    gen.status !== 'completed' ||
    !gen.video_urls?.length
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const jobId = extractOpenRouterJobId(gen.video_urls[0])
  if (!jobId) {
    return NextResponse.json({ error: 'Video unavailable' }, { status: 404 })
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
      console.error('Showcase content fetch failed:', upstream.status, detail)
      return NextResponse.json(
        { error: 'Failed to fetch video content' },
        { status: upstream.status }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4'
    const contentLength = upstream.headers.get('content-length')

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="dmf-showcase-${id}.mp4"`,
    })
    if (contentLength) headers.set('Content-Length', contentLength)

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Showcase content proxy error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
