import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getSongById } from '@/lib/store'
import { sendReleaseAlert } from '@/lib/email'
import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function getSubscriberEmails(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase.from('newsletter_subscribers').select('email')
    return (data || []).map((row) => String(row.email))
  }

  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'newsletter-subscribers.json'), 'utf-8'))
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { song_id } = await req.json()
    if (!song_id) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const emails = await getSubscriberEmails()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com'
    const coverUrl = song.album_cover_path.startsWith('http')
      ? song.album_cover_path
      : `${siteUrl}${song.album_cover_path}`

    const result = await sendReleaseAlert({
      emails,
      title: song.title,
      artist: song.artist,
      description: song.description,
      songUrl: `${siteUrl}/?song=${song.id}#store`,
      coverUrl,
    })

    return NextResponse.json({ success: true, sent: result.sent })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send release alert' },
      { status: 400 }
    )
  }
}
