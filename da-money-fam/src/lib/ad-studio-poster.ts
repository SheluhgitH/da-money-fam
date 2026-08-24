import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { createRequire } from 'module'

const nodeRequire = createRequire(__filename)

function loadFfmpegPath(): string | null {
  try {
    return nodeRequire('ffmpeg-static') as string | null
  } catch {
    return null
  }
}

/**
 * Extract a JPEG poster (~0.5s) from an MP4 buffer using ffmpeg-static when available.
 * Soft-fails (returns null) if ffmpeg is missing or extraction fails — safe for serverless.
 */
export async function extractMp4PosterJpeg(
  videoBuffer: Buffer | Uint8Array,
  seekSec = 0.5
): Promise<Buffer | null> {
  const ffmpegPath = loadFfmpegPath()
  if (!ffmpegPath) return null

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmf-poster-'))
  const inPath = path.join(tmpDir, 'in.mp4')
  const outPath = path.join(tmpDir, 'poster.jpg')

  try {
    await fs.writeFile(inPath, Buffer.from(videoBuffer))

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        ffmpegPath!,
        [
          '-y',
          '-ss',
          String(seekSec),
          '-i',
          inPath,
          '-frames:v',
          '1',
          '-q:v',
          '4',
          outPath,
        ],
        { stdio: ['ignore', 'ignore', 'pipe'] }
      )
      let err = ''
      proc.stderr?.on('data', (chunk) => {
        err += String(chunk)
      })
      proc.on('error', reject)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`))
      })
    })

    return await fs.readFile(outPath)
  } catch (e) {
    console.error('extractMp4PosterJpeg:', e instanceof Error ? e.message : e)
    return null
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** Last video frame as JPEG (near EOF). */
export async function extractLastFrameJpeg(videoBuffer: Buffer | Uint8Array): Promise<Buffer | null> {
  const ffmpegPath = loadFfmpegPath()
  if (!ffmpegPath) return null

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmf-lastframe-'))
  const inPath = path.join(tmpDir, 'in.mp4')
  const outPath = path.join(tmpDir, 'last.jpg')

  try {
    await fs.writeFile(inPath, Buffer.from(videoBuffer))
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        ffmpegPath!,
        ['-y', '-sseof', '-0.2', '-i', inPath, '-frames:v', '1', '-q:v', '4', outPath],
        { stdio: ['ignore', 'ignore', 'pipe'] }
      )
      let err = ''
      proc.stderr?.on('data', (chunk) => {
        err += String(chunk)
      })
      proc.on('error', reject)
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(err.slice(-400) || `ffmpeg exit ${code}`))
      })
    })
    return await fs.readFile(outPath)
  } catch (e) {
    console.error('extractLastFrameJpeg:', e instanceof Error ? e.message : e)
    return null
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

