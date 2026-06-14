import { NextResponse } from 'next/server'
import { getOrderByToken, getSongById } from '@/lib/store'
import { checkRateLimit } from '@/lib/rate-limit'
import { openAudioSource } from '@/lib/audio'
import path from 'path'

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`download:${ip}`, 20, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const order = await getOrderByToken(params.token)

    if (!order) {
      return NextResponse.json({ error: 'Invalid or expired download link' }, { status: 404 })
    }

    const song = await getSongById(order.song_id)
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const source = await openAudioSource(song.mp3_file_path)
    if (!source) {
      return NextResponse.json({ error: 'Audio file unavailable' }, { status: 404 })
    }

    const fileBuffer = await source.readFull()
    const ext = path.extname(song.mp3_file_path).toLowerCase() || '.mp3'
    const safeTitle = song.title.replace(/[^\w\s.-]/g, '').trim() || 'track'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': source.contentType,
        'Content-Disposition': `attachment; filename="${safeTitle}${ext}"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}
