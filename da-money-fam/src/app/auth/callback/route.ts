import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  if (code) {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  }

  const safeRedirect = redirect.startsWith('/') ? redirect : '/'
  return NextResponse.redirect(`${origin}${safeRedirect}`)
}
