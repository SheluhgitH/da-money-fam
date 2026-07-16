import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import { getSongById } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth/user'
import { checkRateLimit } from '@/lib/rate-limit'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`waitlist:${ip}`, 5, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { song_id, email } = await req.json()
    if (!song_id || !email) {
      return NextResponse.json({ error: 'song_id and email are required' }, { status: 400 })
    }

    const emailNorm = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const user = await getCurrentUser()

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient()!
      const { error } = await supabase.from('drop_waitlist').upsert(
        {
          song_id,
          email: emailNorm,
          user_id: user?.id ?? null,
        },
        { onConflict: 'song_id,email' }
      )
      if (error) throw new Error(error.message)
    } else {
      const file = path.join(DATA_DIR, 'drop-waitlist.json')
      let entries: Array<{ song_id: string; email: string; user_id?: string; created_at: string }> = []
      try {
        entries = JSON.parse(await fs.readFile(file, 'utf-8'))
      } catch {
        entries = []
      }
      if (!entries.some((e) => e.song_id === song_id && e.email === emailNorm)) {
        entries.push({
          song_id,
          email: emailNorm,
          user_id: user?.id,
          created_at: new Date().toISOString(),
        })
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.writeFile(file, JSON.stringify(entries, null, 2))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join waitlist' },
      { status: 400 }
    )
  }
}
