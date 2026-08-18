import { NextResponse } from 'next/server'
import { syncKickVideosToSupabase } from '@/lib/kick-videos-sync'
import { KICK_CHANNEL_SLUG } from '@/lib/streams'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return true

  const cronHeader = req.headers.get('x-vercel-cron-secret')
  if (cronHeader && cronHeader === secret) return true

  return false
}

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncKickVideosToSupabase()
    return NextResponse.json(
      {
        channel: KICK_CHANNEL_SLUG,
        ...result,
      },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (error) {
    console.error('Kick sync route error:', error)
    return NextResponse.json(
      { error: 'Sync failed', channel: KICK_CHANNEL_SLUG },
      { status: 500 }
    )
  }
}
