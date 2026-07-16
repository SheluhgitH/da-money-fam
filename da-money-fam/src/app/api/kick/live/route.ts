import { NextResponse } from 'next/server'
import { KICK_CHANNEL_SLUG } from '@/lib/streams'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${KICK_CHANNEL_SLUG}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: `https://kick.com/${KICK_CHANNEL_SLUG}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ live: false, channel: KICK_CHANNEL_SLUG })
    }

    const data = (await res.json()) as { livestream?: { id?: number } | null }
    const live = Boolean(data.livestream?.id)

    return NextResponse.json({
      live,
      channel: KICK_CHANNEL_SLUG,
      watchUrl: `https://kick.com/${KICK_CHANNEL_SLUG}`,
    })
  } catch (error) {
    console.error('Kick live check error:', error)
    return NextResponse.json({ live: false, channel: KICK_CHANNEL_SLUG })
  }
}
