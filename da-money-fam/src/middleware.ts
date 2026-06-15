import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    })

    await supabase.auth.getUser()
  }

  if (pathname.startsWith('/store/audio')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (/\.(mp3|m4a|wav|flac|aac|ogg)$/i.test(pathname)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (pathname.startsWith('/audio/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (pathname.startsWith('/private-audio') || pathname.startsWith('/data/private-audio')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = request.cookies.get('dmf_admin_session')?.value
    if (!session || session.length !== 64) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  if (pathname.startsWith('/admin/login')) {
    const session = request.cookies.get('dmf_admin_session')?.value
    if (session && session.length === 64) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  const protectedPaths = ['/library', '/account']
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)',
  ],
}
