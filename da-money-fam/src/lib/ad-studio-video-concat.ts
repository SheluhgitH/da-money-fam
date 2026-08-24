import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import {
  AD_STUDIO_VIDEOS_BUCKET,
  ensureAdStudioVideosBucket,
  MAX_VIDEO_UPLOAD_BYTES,
} from '@/lib/ad-studio-video-storage'

function ffmpegBin(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('ffmpeg-static') as string | null
  } catch {
    return null
  }
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function runFfmpeg(args: string[]): Promise<void> {
  const bin = ffmpegBin()
  if (!bin) throw new Error('ffmpeg not available')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    proc.stderr?.on('data', (chunk) => {
      err += String(chunk)
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(err.slice(-600) || `ffmpeg exit ${code}`))
    })
  })
}

export async function concatStoryboardMp4s(input: {
  videoUrls: string[]
  userId: string
  generationId: string
}): Promise<string> {
  if (input.videoUrls.length < 2) {
    throw new Error('Need at least two clips to stitch')
  }
  const bin = ffmpegBin()
  if (!bin) throw new Error('ffmpeg not available')

  const supabase = serviceClient()
  if (!supabase) throw new Error('Storage not configured')

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dmf-stitch-'))
  const listPath = path.join(tmpDir, 'list.txt')
  const outPath = path.join(tmpDir, 'out.mp4')

  try {
    const locals: string[] = []
    for (let i = 0; i < input.videoUrls.length; i++) {
      const res = await fetch(input.videoUrls[i])
      if (!res.ok) throw new Error(`Failed to download scene ${i + 1}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.byteLength > MAX_VIDEO_UPLOAD_BYTES) throw new Error('Scene exceeds size limit')
      const p = path.join(tmpDir, `s${i}.mp4`)
      await fs.writeFile(p, buf)
      locals.push(p)
    }

    const listBody = locals.map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n')
    await fs.writeFile(listPath, listBody, 'utf8')

    try {
      await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath])
    } catch {
      await runFfmpeg([
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outPath,
      ])
    }

    const outBuf = await fs.readFile(outPath)
    await ensureAdStudioVideosBucket()
    const storagePath = `${input.userId}/${input.generationId}/stitched.mp4`
    const { error } = await supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).upload(storagePath, outBuf, {
      upsert: true,
      contentType: 'video/mp4',
      cacheControl: '31536000',
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from(AD_STUDIO_VIDEOS_BUCKET).getPublicUrl(storagePath)
    if (!data?.publicUrl) throw new Error('Failed to resolve stitched URL')
    return data.publicUrl
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
