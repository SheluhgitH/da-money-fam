/**
 * Apply supabase/schema.sql to the linked Supabase project.
 * Requires DATABASE_URL in .env.local (Supabase → Settings → Database → URI).
 *
 * Usage: node scripts/apply-schema.mjs
 */
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

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

const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!databaseUrl) {
  console.error(
    'Missing DATABASE_URL. Add it to .env.local from Supabase → Project Settings → Database → Connection string (URI).'
  )
  process.exit(1)
}

const schemaPath = path.join(ROOT, 'supabase', 'schema.sql')
const sql = readFileSync(schemaPath, 'utf-8')

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  await client.connect()
  try {
    await client.query(sql)
    console.log('Schema applied successfully.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Schema apply failed:', err.message)
  process.exit(1)
})
