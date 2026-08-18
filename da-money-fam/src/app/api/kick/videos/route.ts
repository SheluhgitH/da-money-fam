import { NextResponse } from 'next/server'
import { VERIFIED_KICK_VIDEOS } from '@/data/kick-videos'
import { getStreamVideosForApi } from '@/lib/kick-videos-sync'
import { KICK_CHANNEL_SLUG } from '@/lib/streams'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const videos = await getStreamVideosForApi()
    return NextResponse.json(
      { videos, channel: KICK_CHANNEL_SLUG },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('Kick videos route error:', error)
    return NextResponse.json(
      { videos: VERIFIED_KICK_VIDEOS, channel: KICK_CHANNEL_SLUG },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}
