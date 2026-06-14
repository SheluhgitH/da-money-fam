import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { userOwnsSong } from '@/lib/user-store'
import { getSongById } from '@/lib/store'
import { checkRateLimit } from '@/lib/rate-limit'
import { openAudioSource } from '@/lib/audio'
import path from 'path'

export async function GET(
  req: Request,
  { params }: { params: { songId: string } }
) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`stream:${ip}`, 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const owns = await userOwnsSong(user.id, params.songId)
    if (!owns) {
      return NextResponse.json({ error: 'You do not own this track' }, { status: 403 })
    }

    const song = await getSongById(params.songId)
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const source = await openAudioSource(song.mp3_file_path)
    if (!source) {
      return NextResponse.json({ error: 'Audio unavailable' }, { status: 404 })
    }

    const buffer = await source.readFull()
    const ext = path.extname(song.mp3_file_path).replace('.', '') || 'mp3'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': source.contentType,
        'Content-Disposition': `inline; filename="${song.title}.${ext}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Library stream error:', error)
    return NextResponse.json({ error: 'Stream failed' }, { status: 500 })
  }
}
