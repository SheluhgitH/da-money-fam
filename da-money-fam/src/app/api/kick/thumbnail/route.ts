import { NextResponse } from 'next/server'

const ALLOWED_HOSTS = new Set(['images.kick.com', 'files.kick.com'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url')

  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: 'image/*',
        Referer: 'https://kick.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 },
    })

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const bytes = await upstream.arrayBuffer()
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'image/webp',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Kick thumbnail proxy error:', error)
    return new NextResponse(null, { status: 502 })
  }
}
