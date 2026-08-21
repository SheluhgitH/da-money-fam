import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserCosmetics, setCosmeticEnabled } from '@/lib/user-store'
import { getCosmeticMeta, isCosmeticSlug } from '@/lib/profile-cosmetics'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cosmetics = await getUserCosmetics(user.id)
    const enriched = cosmetics.map((c) => {
      const meta = getCosmeticMeta(c.cosmetic_slug)
      return {
        ...c,
        label: meta?.label || c.cosmetic_slug,
        description: meta?.description || '',
      }
    })
    const unrevealed = enriched
      .filter((c) => !c.revealed_at)
      .map((c) => ({
        slug: c.cosmetic_slug,
        label: c.label,
        description: c.description,
        gift_message: c.gift_message,
      }))

    return NextResponse.json({
      cosmetics: enriched,
      unrevealed,
      active: enriched.filter((c) => c.enabled).map((c) => c.cosmetic_slug),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load cosmetics' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (!isCosmeticSlug(body.slug)) {
      return NextResponse.json({ error: 'Invalid cosmetic slug' }, { status: 400 })
    }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const cosmetic = await setCosmeticEnabled(user.id, body.slug, body.enabled)
    return NextResponse.json({ cosmetic })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update cosmetic' },
      { status: 400 }
    )
  }
}
