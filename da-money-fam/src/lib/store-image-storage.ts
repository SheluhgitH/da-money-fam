import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export const STORE_COVERS_BUCKET = 'store-covers'
export type StoreImageFolder = 'covers' | 'blog'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function extFromContentType(contentType: string): string {
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  return 'png'
}

export async function ensureStoreCoversBucket(): Promise<void> {
  const supabase = serviceClient()
  if (!supabase) return
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === STORE_COVERS_BUCKET)) return
  await supabase.storage.createBucket(STORE_COVERS_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  })
}

async function saveLocalPublicImage(
  buffer: Buffer,
  folder: StoreImageFolder,
  contentType: string,
  filename?: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const name = filename || `${Date.now()}-ai-cover.${ext}`
  const relativePath = `/store/${folder}/${name}`
  const absolutePath = path.join(process.cwd(), 'public', 'store', folder, name)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, buffer)
  return relativePath
}

/**
 * Upload a public store image to Supabase `store-covers`.
 * Falls back to local `public/store/` when Supabase is not configured (local dev).
 * Returns a full public URL when using Supabase, or a `/store/...` path for local files.
 */
export async function uploadStorePublicImage(
  buffer: Buffer,
  folder: StoreImageFolder,
  contentType = 'image/png',
  filenameHint?: string
): Promise<string> {
  const supabase = serviceClient()
  if (!supabase) {
    return saveLocalPublicImage(buffer, folder, contentType, filenameHint)
  }

  await ensureStoreCoversBucket()

  const ext = extFromContentType(contentType)
  const safeHint = filenameHint
    ? filenameHint.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\.[^.]+$/, '')
    : 'ai-cover'
  const objectPath = `${folder}/${Date.now()}-${safeHint}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(STORE_COVERS_BUCKET).upload(objectPath, buffer, {
    contentType,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(STORE_COVERS_BUCKET).getPublicUrl(objectPath)
  if (!data?.publicUrl) throw new Error('Failed to get public URL for store cover')

  return data.publicUrl
}
