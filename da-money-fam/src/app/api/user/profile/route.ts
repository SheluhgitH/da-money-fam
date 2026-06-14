import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserProfile, upsertUserProfile, ensureUserProfile } from '@/lib/user-store'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await ensureUserProfile(user.id, user.email)
  return NextResponse.json({
    profile,
    email: user.email,
  })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const profile = await upsertUserProfile(user.id, {
      display_name: body.display_name,
      avatar_url: body.avatar_url,
    })
    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 400 }
    )
  }
}
