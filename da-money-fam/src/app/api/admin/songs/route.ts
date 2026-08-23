import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import {
  createSong,
  deleteSong,
  getAllSongs,
  getSongById,
  saveUploadedFile,
  updateSong,
} from '@/lib/store'
import { songSchema, songUpdateSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const songs = await getAllSongs()
  return NextResponse.json({ songs })
}

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = checkRateLimit('admin-upload', 10, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const mp3File = formData.get('mp3') as File | null
    const coverFile = formData.get('cover') as File | null

    const previewStartRaw = formData.get('preview_start_sec')
    const trackDurationRaw = formData.get('track_duration_sec')
    const preview_start_sec = Math.max(0, Number(previewStartRaw ?? 0) || 0)
    const track_duration_sec =
      trackDurationRaw != null && String(trackDurationRaw).trim() !== ''
        ? Math.max(0, Number(trackDurationRaw) || 0)
        : undefined

    const payload = {
      title: String(formData.get('title') || ''),
      artist: String(formData.get('artist') || 'JackPot'),
      price: Number(formData.get('price') || 1.99),
      genre: String(formData.get('genre') || ''),
      release_date: String(formData.get('release_date') || ''),
      description: String(formData.get('description') || ''),
      is_promoted: formData.get('is_promoted') === 'true',
      is_published: formData.get('is_published') !== 'false',
      for_sale: formData.get('for_sale') !== 'false',
      preview_start_sec,
      track_duration_sec: track_duration_sec || undefined,
    }

    await songSchema.validate(payload)

    let mp3Path = String(formData.get('mp3_file_path') || '')
    let coverPath = String(formData.get('album_cover_path') || '')

    if (mp3File && mp3File.size > 0) {
      mp3Path = await saveUploadedFile(mp3File, 'audio')
    }
    if (coverFile && coverFile.size > 0) {
      coverPath = await saveUploadedFile(coverFile, 'covers')
    }

    if (!mp3Path || !coverPath) {
      return NextResponse.json(
        { error: 'MP3 and album cover are required' },
        { status: 400 }
      )
    }

    const song = await createSong({
      id: randomUUID(),
      title: payload.title,
      artist: payload.artist,
      album_cover_path: coverPath,
      mp3_file_path: mp3Path,
      preview_path: mp3Path,
      preview_start_sec: payload.preview_start_sec,
      track_duration_sec: payload.track_duration_sec,
      price: payload.price,
      is_promoted: payload.is_promoted,
      for_sale: payload.for_sale,
      access: 'public',
      genre: payload.genre || undefined,
      release_date: payload.release_date || undefined,
      description: payload.description || undefined,
      is_published: payload.is_published,
    })

    return NextResponse.json({ song }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/songs error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create song' },
      { status: 400 }
    )
  }
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const id = String(formData.get('id') || '')

      if (!id) {
        return NextResponse.json({ error: 'Song id is required' }, { status: 400 })
      }

      const existing = await getSongById(id)
      if (!existing) {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 })
      }

      const previewStartRaw = formData.get('preview_start_sec')
      const trackDurationRaw = formData.get('track_duration_sec')
      const preview_start_sec =
        previewStartRaw != null && String(previewStartRaw).trim() !== ''
          ? Math.max(0, Number(previewStartRaw) || 0)
          : existing.preview_start_sec ?? 0
      const track_duration_sec =
        trackDurationRaw != null && String(trackDurationRaw).trim() !== ''
          ? Math.max(0, Number(trackDurationRaw) || 0)
          : existing.track_duration_sec

      const payload = {
        title: String(formData.get('title') || existing.title),
        artist: String(formData.get('artist') || existing.artist),
        price: Number(formData.get('price') ?? existing.price),
        genre: String(formData.get('genre') || ''),
        release_date: String(formData.get('release_date') || ''),
        description: String(formData.get('description') || ''),
        is_promoted: formData.get('is_promoted') === 'true',
        is_published: formData.get('is_published') === 'true',
        for_sale: formData.get('for_sale') !== 'false',
        preview_start_sec,
        track_duration_sec: track_duration_sec || undefined,
      }

      await songUpdateSchema.validate(payload)

      const updates: Record<string, unknown> = {
        title: payload.title,
        artist: payload.artist,
        price: payload.price,
        is_promoted: payload.is_promoted,
        is_published: payload.is_published,
        for_sale: payload.for_sale,
        genre: payload.genre || undefined,
        release_date: payload.release_date || undefined,
        description: payload.description || undefined,
        preview_start_sec: payload.preview_start_sec,
        track_duration_sec: payload.track_duration_sec,
      }

      const mp3File = formData.get('mp3') as File | null
      const coverFile = formData.get('cover') as File | null

      if (mp3File && mp3File.size > 0) {
        const mp3Path = await saveUploadedFile(mp3File, 'audio')
        updates.mp3_file_path = mp3Path
        updates.preview_path = mp3Path
        // New audio: keep submitted start if set, otherwise reset to 0
        if (previewStartRaw == null || String(previewStartRaw).trim() === '') {
          updates.preview_start_sec = 0
        }
      }

      if (coverFile && coverFile.size > 0) {
        updates.album_cover_path = await saveUploadedFile(coverFile, 'covers')
      } else {
        const coverPath = String(formData.get('album_cover_path') || '').trim()
        if (coverPath) {
          updates.album_cover_path = coverPath
        }
      }

      const song = await updateSong(id, updates)
      return NextResponse.json({ song })
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Song id is required' }, { status: 400 })
    }

    const song = await updateSong(id, updates)
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    return NextResponse.json({ song })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update song' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Song id is required' }, { status: 400 })
  }

  const deleted = await deleteSong(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
