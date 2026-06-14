import { NextResponse } from 'next/server'
import {
  createAdminSessionToken,
  verifyAdminPassword,
} from '@/lib/store'
import { ADMIN_COOKIE } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`admin-login:${ip}`, 5, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 })
  }

  try {
    const { password } = await req.json()

    if (!password || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = createAdminSessionToken()
    const response = NextResponse.json({ success: true })
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
