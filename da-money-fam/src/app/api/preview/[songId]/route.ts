import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { isAdminAuthenticated } from '@/lib/auth'
import { getSongById } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth/user'
import { userOwnsSong } from '@/lib/user-store'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  resolveAudioAbsolutePath,
  readPreviewBuffer,
  readPreviewRange,
  readFullAudioBuffer,
  getPreviewByteLength,
  getContentType,
  PREVIEW_MAX_BYTES,
} from '@/lib/audio'
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

    const user = await getCurrentUser()
    const owns = user ? await userOwnsSong(user.id, params.songId) : false
    const isAdmin = isAdminAuthenticated()
    const serveFull = owns || isAdmin

    const internalPath = song.preview_path || song.mp3_file_path
    const absolutePath = await resolveAudioAbsolutePath(internalPath)
    if (!absolutePath) {
      return NextResponse.json({ error: 'Preview unavailable' }, { status: 404 })
    }

    const contentType = getContentType(absolutePath)
    const fileStats = await fs.stat(absolutePath)
    const effectiveSize = serveFull
      ? fileStats.size
      : await getPreviewByteLength(absolutePath)

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
        if (!serveFull) {
          end = Math.min(end, PREVIEW_MAX_BYTES - 1)
        }
        end = Math.min(end, effectiveSize - 1)

        const chunk = await readPreviewRange(absolutePath, start, end)

        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${effectiveSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, no-store',
            ...(!serveFull ? { 'X-Preview-Max-Seconds': String(PREVIEW_DURATION_SEC) } : {}),
          },
        })
      }
    }

    const buffer = serveFull
      ? await readFullAudioBuffer(absolutePath)
      : await readPreviewBuffer(absolutePath)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        ...(!serveFull ? { 'X-Preview-Max-Seconds': String(PREVIEW_DURATION_SEC) } : {}),
      },
    })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
