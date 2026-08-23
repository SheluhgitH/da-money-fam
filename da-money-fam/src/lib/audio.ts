import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { PREVIEW_MAX_BYTES } from '@/lib/audio-constants'
import { createServiceClient } from '@/lib/supabase/server'

export { PREVIEW_DURATION_SEC, PREVIEW_MAX_BYTES } from '@/lib/audio-constants'

const DATA_DIR = path.join(process.cwd(), 'data')
const PRIVATE_AUDIO_DIR = path.join(DATA_DIR, 'private-audio')
const STORAGE_BUCKET = 'store-audio'

function storageServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function ensureStoreAudioBucket(): Promise<void> {
  const supabase = storageServiceClient()
  if (!supabase) return
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === STORAGE_BUCKET)) return
  await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024,
  })
}

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.wav') return 'audio/wav'
  return 'application/octet-stream'
}

function getStorageObjectKey(internalPath: string): string | null {
  const normalized = internalPath.replace(/^\//, '')

  if (normalized.startsWith('private-audio/')) {
    return normalized.slice('private-audio/'.length)
  }

  if (normalized.startsWith('store/audio/')) {
    return path.basename(normalized)
  }

  return null
}

async function downloadFromSupabase(objectKey: string): Promise<Buffer | null> {
  const supabase = createServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(objectKey)
  if (error || !data) return null

  return Buffer.from(await data.arrayBuffer())
}

/** Resolve internal song path to absolute filesystem path */
export async function resolveAudioAbsolutePath(internalPath: string): Promise<string | null> {
  const normalized = internalPath.replace(/^\//, '')

  if (normalized.startsWith('private-audio/')) {
    const absolute = path.join(DATA_DIR, normalized)
    try {
      await fs.access(absolute)
      return absolute
    } catch {
      return null
    }
  }

  if (normalized.startsWith('store/audio/')) {
    const privateCandidate = path.join(PRIVATE_AUDIO_DIR, path.basename(normalized))
    try {
      await fs.access(privateCandidate)
      return privateCandidate
    } catch {
      return null
    }
  }

  if (normalized.startsWith('public/')) {
    const absolute = path.join(process.cwd(), normalized)
    try {
      await fs.access(absolute)
      return absolute
    } catch {
      return null
    }
  }

  return null
}

export type AudioSource = {
  contentType: string
  size: number
  readFull: () => Promise<Buffer>
  readRange: (start: number, end: number) => Promise<Buffer>
}

let remoteBufferCache: Map<string, Promise<Buffer | null>> | null = null

function getRemoteBuffer(objectKey: string): Promise<Buffer | null> {
  if (!remoteBufferCache) remoteBufferCache = new Map()
  const existing = remoteBufferCache.get(objectKey)
  if (existing) return existing

  const pending = downloadFromSupabase(objectKey)
  remoteBufferCache.set(objectKey, pending)
  return pending
}

/** Open audio from local disk or Supabase Storage (for Vercel production). */
export async function openAudioSource(internalPath: string): Promise<AudioSource | null> {
  const absolutePath = await resolveAudioAbsolutePath(internalPath)
  if (absolutePath) {
    const contentType = getContentType(absolutePath)
    const stats = await fs.stat(absolutePath)

    return {
      contentType,
      size: stats.size,
      readFull: () => fs.readFile(absolutePath),
      readRange: async (start, end) => {
        const length = end - start + 1
        const buffer = Buffer.alloc(length)
        const fd = await fs.open(absolutePath, 'r')
        try {
          await fd.read(buffer, 0, length, start)
        } finally {
          await fd.close()
        }
        return buffer
      },
    }
  }

  const objectKey = getStorageObjectKey(internalPath)
  if (!objectKey) return null

  const buffer = await getRemoteBuffer(objectKey)
  if (!buffer) return null

  const contentType = getContentType(objectKey)
  return {
    contentType,
    size: buffer.length,
    readFull: async () => buffer,
    readRange: async (start, end) => buffer.subarray(start, end + 1),
  }
}

export async function readPreviewBuffer(absolutePath: string): Promise<Buffer> {
  const fileBuffer = await fs.readFile(absolutePath)
  return fileBuffer.subarray(0, Math.min(fileBuffer.length, PREVIEW_MAX_BYTES))
}

export type PreviewByteWindow = {
  byteStart: number
  byteEnd: number
  virtualSize: number
}

/**
 * Map a time-based preview window onto MP3 file bytes.
 * Prefer known track_duration_sec; otherwise estimate from size @ ~320kbps.
 * When a probe buffer is provided, snap byteStart forward to an MPEG frame sync.
 */
export function getPreviewByteWindow(
  fileSize: number,
  startSec: number,
  durationSec: number | null | undefined,
  maxBytes: number = PREVIEW_MAX_BYTES,
  probe?: Buffer | Uint8Array | null
): PreviewByteWindow {
  if (fileSize <= 0) {
    return { byteStart: 0, byteEnd: 0, virtualSize: 0 }
  }

  const safeStart = Math.max(0, Number(startSec) || 0)
  const knownDuration =
    durationSec != null && Number(durationSec) > 0 ? Number(durationSec) : null

  // Rough CBR estimate when duration unknown (~320 kbps MPEG)
  const estimatedDuration =
    knownDuration ?? Math.max(1, (fileSize * 8) / (320 * 1000))

  const clampedStart = Math.min(safeStart, Math.max(0, estimatedDuration - 1))
  let byteStart = Math.floor((clampedStart / estimatedDuration) * fileSize)
  byteStart = Math.max(0, Math.min(byteStart, Math.max(0, fileSize - 1)))

  if (byteStart > 0) {
    // Coarse align, then snap to next MPEG frame sync if we have bytes to scan
    byteStart = Math.floor(byteStart / 1024) * 1024
    if (probe && probe.length > 0) {
      const synced = findMpegFrameSync(probe, 0)
      if (synced >= 0) byteStart = byteStart + synced
    }
  }

  byteStart = Math.max(0, Math.min(byteStart, Math.max(0, fileSize - 1)))
  const byteEnd = Math.min(fileSize, byteStart + maxBytes)
  const virtualSize = Math.max(0, byteEnd - byteStart)

  return { byteStart, byteEnd, virtualSize }
}

/** Find next MPEG audio frame sync (0xFFEx) within probe, relative to offset 0 of probe. */
export function findMpegFrameSync(probe: Buffer | Uint8Array, from = 0): number {
  const len = probe.length
  for (let i = Math.max(0, from); i < len - 1; i++) {
    if (probe[i] === 0xff && (probe[i + 1] & 0xe0) === 0xe0) {
      return i
    }
  }
  return -1
}

export async function getPreviewByteLength(absolutePath: string): Promise<number> {
  const stats = await fs.stat(absolutePath)
  return Math.min(stats.size, PREVIEW_MAX_BYTES)
}

export async function readPreviewRange(
  absolutePath: string,
  start: number,
  end: number
): Promise<Buffer> {
  const length = end - start + 1
  const buffer = Buffer.alloc(length)
  const fd = await fs.open(absolutePath, 'r')
  try {
    await fd.read(buffer, 0, length, start)
  } finally {
    await fd.close()
  }
  return buffer
}

export async function readFullAudioBuffer(absolutePath: string): Promise<Buffer> {
  return fs.readFile(absolutePath)
}

export function getPrivateAudioDir(): string {
  return PRIVATE_AUDIO_DIR
}

export async function uploadAudioToStorage(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<boolean> {
  const supabase = storageServiceClient()
  if (!supabase) return false

  await ensureStoreAudioBucket()

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, {
    upsert: true,
    contentType,
  })

  if (error) throw new Error(error.message)
  return true
}
