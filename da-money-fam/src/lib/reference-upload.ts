import { createClient } from '@supabase/supabase-js'

export const AD_STUDIO_REFS_BUCKET = 'ad-studio-refs'
export const MAX_REF_UPLOAD_BYTES = 4 * 1024 * 1024
export const MAX_REF_PROCESSED_BYTES = 3 * 1024 * 1024
export const MAX_REF_AUDIO_BYTES = 15 * 1024 * 1024

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function ensureRefsBucket(): Promise<void> {
  const supabase = serviceClient()
  if (!supabase) return
  const { data } = await supabase.storage.listBuckets()
  if (!data?.some((b) => b.name === AD_STUDIO_REFS_BUCKET)) {
    await supabase.storage.createBucket(AD_STUDIO_REFS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_REF_AUDIO_BYTES,
    })
  }
  try {
    await supabase.storage.updateBucket(AD_STUDIO_REFS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_REF_AUDIO_BYTES,
    })
  } catch {
    /* existing bucket may already allow larger files */
  }
}

/** Decode data URL or accept raw buffer; store as JPEG-ish bytes under user folder */
export async function uploadReferenceImage(input: {
  userId: string
  dataUrlOrBase64: string
  contentType?: string
}): Promise<{ url: string; path: string }> {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Storage not configured')

  await ensureRefsBucket()

  let bytes: Buffer
  let contentType = input.contentType || 'image/jpeg'

  if (input.dataUrlOrBase64.startsWith('data:')) {
    const match = input.dataUrlOrBase64.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) throw new Error('Invalid data URL')
    contentType = match[1]
    bytes = Buffer.from(match[2], 'base64')
  } else {
    bytes = Buffer.from(input.dataUrlOrBase64, 'base64')
  }

  if (bytes.length > MAX_REF_UPLOAD_BYTES) {
    throw new Error('Image too large (max 4MB)')
  }
  if (bytes.length > MAX_REF_PROCESSED_BYTES) {
    // Soft reject oversized processed payloads for Riverflow compatibility
    throw new Error('Image too large after processing (max 3MB). Try a smaller file.')
  }

  const ext =
    contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(AD_STUDIO_REFS_BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(AD_STUDIO_REFS_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to get public URL')

  return { url: data.publicUrl, path }
}

export async function uploadGeneratedImageBuffer(input: {
  userId: string
  buffer: Buffer
  contentType?: string
}): Promise<{ url: string; path: string }> {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Storage not configured')
  await ensureRefsBucket()

  const contentType = input.contentType || 'image/png'
  const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png'
  const path = `${input.userId}/gen/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(AD_STUDIO_REFS_BUCKET).upload(path, input.buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(AD_STUDIO_REFS_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to get public URL')
  return { url: data.publicUrl, path }
}

export function isAudioContentType(contentType: string, filename?: string): boolean {
  const t = contentType.toLowerCase()
  const name = (filename || '').toLowerCase()
  return (
    t.includes('audio/mpeg') ||
    t.includes('audio/mp3') ||
    t.includes('audio/wav') ||
    t.includes('audio/x-wav') ||
    t.includes('audio/wave') ||
    /\.mp3$/i.test(name) ||
    /\.wav$/i.test(name)
  )
}

export async function uploadReferenceAudio(input: {
  userId: string
  buffer: Buffer
  contentType?: string
  filename?: string
}): Promise<{ url: string; path: string }> {
  const supabase = serviceClient()
  if (!supabase) throw new Error('Storage not configured')

  await ensureRefsBucket()

  if (input.buffer.length > MAX_REF_AUDIO_BYTES) {
    throw new Error('Audio too large (max 15MB)')
  }

  const name = (input.filename || '').toLowerCase()
  const type = (input.contentType || '').toLowerCase()
  const ext = name.endsWith('.wav') || type.includes('wav') ? 'wav' : 'mp3'
  const contentType = ext === 'wav' ? 'audio/wav' : 'audio/mpeg'
  const path = `${input.userId}/audio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(AD_STUDIO_REFS_BUCKET).upload(path, input.buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(AD_STUDIO_REFS_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Failed to get public URL')
  return { url: data.publicUrl, path }
}
