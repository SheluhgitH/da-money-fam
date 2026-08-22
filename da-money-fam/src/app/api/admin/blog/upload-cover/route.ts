import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { saveUploadedFile } from '@/lib/store'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = checkRateLimit('admin-blog-upload-cover', 20, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await req.formData()
    const coverFile = formData.get('cover') as File | null

    if (!coverFile || coverFile.size === 0) {
      return NextResponse.json({ error: 'Cover image file is required' }, { status: 400 })
    }

    if (coverFile.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (max 8MB)' }, { status: 400 })
    }

    const type = (coverFile.type || '').toLowerCase()
    const nameOk = /\.(jpe?g|png|webp|gif)$/i.test(coverFile.name)
    if (!ALLOWED_TYPES.has(type) && !nameOk) {
      return NextResponse.json(
        { error: 'Invalid image type — use JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      )
    }

    const cover_image_url = await saveUploadedFile(coverFile, 'blog')
    return NextResponse.json({
      cover_image_url,
      previewUrl: cover_image_url,
    })
  } catch (error) {
    console.error('POST /api/admin/blog/upload-cover:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload cover' },
      { status: 500 }
    )
  }
}
