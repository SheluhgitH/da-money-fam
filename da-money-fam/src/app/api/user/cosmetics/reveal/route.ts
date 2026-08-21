import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { markCosmeticRevealed } from '@/lib/user-store'
import { isCosmeticSlug, type CosmeticSlug } from '@/lib/profile-cosmetics'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const rawSlugs = Array.isArray(body.slugs)
      ? body.slugs
      : typeof body.slug === 'string'
        ? [body.slug]
        : []
    const slugs = rawSlugs.filter(isCosmeticSlug) as CosmeticSlug[]
    if (slugs.length === 0) {
      return NextResponse.json({ error: 'No valid slugs provided' }, { status: 400 })
    }

    const enable = typeof body.enable === 'boolean' ? body.enable : undefined
    await markCosmeticRevealed(user.id, slugs, { enable })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reveal cosmetic' },
      { status: 400 }
    )
  }
}
