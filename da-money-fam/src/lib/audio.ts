import { promises as fs } from 'fs'
import path from 'path'
import { PREVIEW_MAX_BYTES } from '@/lib/audio-constants'

export { PREVIEW_DURATION_SEC, PREVIEW_MAX_BYTES } from '@/lib/audio-constants'

const DATA_DIR = path.join(process.cwd(), 'data')
const PRIVATE_AUDIO_DIR = path.join(DATA_DIR, 'private-audio')

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  if (ext === '.wav') return 'audio/wav'
  return 'application/octet-stream'
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

export async function readPreviewBuffer(absolutePath: string): Promise<Buffer> {
  const fileBuffer = await fs.readFile(absolutePath)
  return fileBuffer.subarray(0, Math.min(fileBuffer.length, PREVIEW_MAX_BYTES))
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
