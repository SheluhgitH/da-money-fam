import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createServiceClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`newsletter:${ip}`, 5, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { email } = await req.json()
    const emailNorm = String(email || '').trim().toLowerCase()
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient()!
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email: emailNorm }, { onConflict: 'email' })
      if (error) throw new Error(error.message)
    } else {
      const file = path.join(DATA_DIR, 'newsletter-subscribers.json')
      let emails: string[] = []
      try {
        emails = JSON.parse(await fs.readFile(file, 'utf-8'))
      } catch {
        emails = []
      }
      if (!emails.includes(emailNorm)) {
        emails.push(emailNorm)
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.writeFile(file, JSON.stringify(emails, null, 2))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to subscribe' },
      { status: 400 }
    )
  }
}
