import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getSongById } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth/user'
import { userOwnsSong } from '@/lib/user-store'
import { checkRateLimit } from '@/lib/rate-limit'
import { getPreviewByteWindow, openAudioSource, PREVIEW_MAX_BYTES } from '@/lib/audio'
import { PREVIEW_DURATION_SEC } from '@/lib/audio-constants'

export async function GET(
  req: Request,
  { params }: { params: { songId: string } }
) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`preview:${ip}`, 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const song = await getSongById(params.songId)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const wantFull = searchParams.get('full') === '1'

    const user = await getCurrentUser()
    const owns = user ? await userOwnsSong(user.id, params.songId) : false
    const isAdmin = isAdminAuthenticated()
    // Admin cookie must NOT force full file on the public store — only ?full=1
    const serveFull = owns || (isAdmin && wantFull)

    const internalPath = song.preview_path || song.mp3_file_path
    const source = await openAudioSource(internalPath)
    if (!source) {
      return NextResponse.json({ error: 'Preview unavailable' }, { status: 404 })
    }

    let window: { byteStart: number; byteEnd: number; virtualSize: number }
    if (serveFull) {
      window = { byteStart: 0, byteEnd: source.size, virtualSize: source.size }
    } else {
      const startSec = song.preview_start_sec ?? 0
      // Probe ahead of estimated start so we can snap to an MPEG frame sync
      const rough = getPreviewByteWindow(
        source.size,
        startSec,
        song.track_duration_sec,
        PREVIEW_MAX_BYTES
      )
      let probe: Buffer | null = null
      if (rough.byteStart > 0 && rough.byteStart < source.size) {
        const probeEnd = Math.min(source.size - 1, rough.byteStart + 8192)
        try {
          probe = await source.readRange(rough.byteStart, probeEnd)
        } catch {
          probe = null
        }
      }
      window = getPreviewByteWindow(
        source.size,
        startSec,
        song.track_duration_sec,
        PREVIEW_MAX_BYTES,
        probe
      )
    }

    const effectiveSize = window.virtualSize
    const originOffset = window.byteStart

    const rangeHeader = req.headers.get('range')
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        const start = parseInt(match[1], 10)
        if (start >= effectiveSize) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${effectiveSize}` },
          })
        }

        let end = match[2] ? parseInt(match[2], 10) : effectiveSize - 1
        end = Math.min(end, effectiveSize - 1)

        const chunk = await source.readRange(originOffset + start, originOffset + end)

        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            'Content-Type': source.contentType,
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${effectiveSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, no-store',
            ...(!serveFull ? { 'X-Preview-Max-Seconds': String(PREVIEW_DURATION_SEC) } : {}),
          },
        })
      }
    }

    if (serveFull) {
      const buffer = await source.readFull()
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': source.contentType,
          'Content-Length': String(buffer.length),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    const buffer =
      effectiveSize > 0
        ? await source.readRange(originOffset, originOffset + effectiveSize - 1)
        : Buffer.alloc(0)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': source.contentType,
        'Content-Length': String(buffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Preview-Max-Seconds': String(PREVIEW_DURATION_SEC),
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
