/**
 * Seed songs from data/songs.json into Supabase.
 * Requires schema.sql to be run first (npm run seed:songs).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const songsPath = path.join(ROOT, 'data', 'songs.json')
  const songs = JSON.parse(readFileSync(songsPath, 'utf-8'))

  for (const song of songs) {
    const row = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album_cover_path: song.album_cover_path,
      mp3_file_path: song.mp3_file_path,
      preview_path: song.preview_path ?? song.mp3_file_path,
      price: song.price,
      is_promoted: song.is_promoted,
      for_sale: song.for_sale !== false,
      genre: song.genre ?? null,
      release_date: song.release_date ?? null,
      description: song.description ?? null,
      is_published: song.is_published,
      created_at: song.created_at,
      updated_at: song.updated_at,
    }

    const { error } = await supabase.from('songs').upsert(row, { onConflict: 'id' })
    if (error) {
      console.error(`Failed to seed ${song.id}:`, error.message)
      if (error.message.includes('schema cache') || error.message.includes('Could not find')) {
        console.error('\nRun supabase/schema.sql in the Supabase SQL Editor first.')
      }
      process.exit(1)
    }
    console.log(`Seeded: ${song.title}`)
  }

  console.log(`Done — ${songs.length} song(s) in Supabase`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
