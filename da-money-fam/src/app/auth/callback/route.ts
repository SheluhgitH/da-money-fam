import { createClient } from '@/lib/supabase/server'
import { linkGuestOrdersToUser } from '@/lib/store'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  if (code) {
    const supabase = createClient()
    if (supabase) {
      const { data } = await supabase.auth.exchangeCodeForSession(code)
      if (data.user?.id && data.user.email) {
        await linkGuestOrdersToUser(data.user.id, data.user.email)
      }
    }
  }

  const safeRedirect = redirect.startsWith('/') ? redirect : '/'
  return NextResponse.redirect(`${origin}${safeRedirect}`)
}
