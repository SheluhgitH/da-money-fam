/**
 * Persist featured (and optionally all) Ad Studio proxy videos to Supabase CDN.
 * Usage: node scripts/persist-ad-studio-videos.mjs
 * Loads .env.local from project root.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = resolve(root, name)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!m) continue
      let v = m[2].trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OR_KEY = process.env.OPENROUTER_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !OR_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENROUTER_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = 'ad-studio-videos'

function extractJobId(url) {
  const m = String(url || '').match(/\/api\/video\/([^/]+)\/content/)
  return m?.[1] || null
}

function isDurable(url) {
  if (!url || String(url).startsWith('/api/video/')) return false
  return /^https?:\/\//i.test(url)
}

async function ensureBucket() {
  const { data } = await supabase.storage.listBuckets()
  if (data?.some((b) => b.name === BUCKET)) return
  await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 100 * 1024 * 1024 })
}

async function persistJob(jobId, userId, generationId) {
  const upstream = await fetch(
    `https://openrouter.ai/api/v1/videos/${jobId}/content?index=0`,
    { headers: { Authorization: `Bearer ${OR_KEY}` }, redirect: 'follow' }
  )
  if (!upstream.ok) {
    throw new Error(`OpenRouter ${upstream.status}`)
  }
  const buf = Buffer.from(await upstream.arrayBuffer())
  const path = `${userId}/${generationId}/${jobId}.mp4`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    upsert: true,
    contentType: 'video/mp4',
    cacheControl: '31536000',
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

async function main() {
  await ensureBucket()
  const { data, error } = await supabase
    .from('ad_studio_generations')
    .select('id, user_id, video_urls, thumbnail_url, featured, status')
    .eq('status', 'completed')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) throw error

  const candidates = (data || []).filter((row) =>
    (row.video_urls || []).some((u) => !isDurable(u) && extractJobId(u))
  )

  console.log(`Found ${candidates.length} featured gens needing persist`)

  let ok = 0
  let fail = 0
  for (const row of candidates) {
    const next = []
    let first = null
    let errMsg = ''
    for (const url of row.video_urls || []) {
      if (isDurable(url)) {
        next.push(url)
        if (!first) first = url
        continue
      }
      const jobId = extractJobId(url)
      if (!jobId) {
        next.push(url)
        continue
      }
      try {
        const publicUrl = await persistJob(jobId, row.user_id, row.id)
        next.push(publicUrl)
        if (!first) first = publicUrl
        console.log('OK', row.id, publicUrl.slice(0, 80))
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e)
        next.push(url)
        console.error('FAIL', row.id, errMsg)
      }
    }
    if (first && next.every((u, i) => u === (row.video_urls || [])[i] ? false : true || isDurable(u))) {
      // update if any durable
    }
    if (first && next.some(isDurable)) {
      const { error: upErr } = await supabase
        .from('ad_studio_generations')
        .update({ video_urls: next, thumbnail_url: first })
        .eq('id', row.id)
      if (upErr) {
        fail++
        console.error('DB', row.id, upErr.message)
      } else {
        ok++
      }
    } else {
      fail++
    }
  }

  console.log(JSON.stringify({ attempted: candidates.length, ok, fail }))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
