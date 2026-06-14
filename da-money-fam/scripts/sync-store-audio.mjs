/**
 * Upload store audio to Supabase Storage (private store-audio bucket).
 * Run from da-money-fam: node scripts/sync-store-audio.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { promises as fs, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BUCKET = 'store-audio'

function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename)
  try {
    const raw = readFileSync(filePath, 'utf-8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.m4a') return 'audio/mp4'
  return 'application/octet-stream'
}

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (exists) return

  const { error } = await supabase.storage.createBucket(BUCKET, { public: false })
  if (error) throw new Error(`Create bucket failed: ${error.message}`)
  console.log(`Created bucket: ${BUCKET}`)
}

async function collectAudioFiles() {
  const dirs = [
    path.join(ROOT, 'data', 'private-audio'),
    path.join(ROOT, 'public', 'store', 'audio'),
  ]

  const files = new Map()

  for (const dir of dirs) {
    try {
      const entries = await fs.readdir(dir)
      for (const name of entries) {
        if (!/\.(mp3|m4a|wav)$/i.test(name)) continue
        if (!files.has(name)) files.set(name, path.join(dir, name))
      }
    } catch {
      // directory may not exist
    }
  }

  return files
}

async function main() {
  await ensureBucket()

  const files = await collectAudioFiles()
  if (files.size === 0) {
    console.error('No audio files found in data/private-audio or public/store/audio')
    process.exit(1)
  }

  for (const [name, filePath] of files) {
    const buffer = await fs.readFile(filePath)
    const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
      upsert: true,
      contentType: contentType(name),
    })

    if (error) {
      console.error(`Failed ${name}:`, error.message)
      process.exit(1)
    }

    console.log(`Uploaded ${name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
  }

  console.log(`Done — ${files.size} file(s) in ${BUCKET}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
