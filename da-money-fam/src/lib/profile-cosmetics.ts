export const COSMETIC_SLUGS = ['crown_gold', 'name_gold_glow', 'verified_check'] as const

export type CosmeticSlug = (typeof COSMETIC_SLUGS)[number]

export type CosmeticCatalogEntry = {
  slug: CosmeticSlug
  label: string
  description: string
}

export const PROFILE_COSMETICS: CosmeticCatalogEntry[] = [
  {
    slug: 'crown_gold',
    label: 'Royal Crown',
    description: 'A gold crown sits slanted above your display name',
  },
  {
    slug: 'name_gold_glow',
    label: 'Gold Glow',
    description: 'Your name shines with a soft animated gold glow',
  },
  {
    slug: 'verified_check',
    label: 'Verified',
    description: 'A gold verified check badge beside your name',
  },
]

export const GIFT_MESSAGE_MAX = 280

export function isCosmeticSlug(value: unknown): value is CosmeticSlug {
  return typeof value === 'string' && (COSMETIC_SLUGS as readonly string[]).includes(value)
}

export function getCosmeticMeta(slug: string): CosmeticCatalogEntry | undefined {
  return PROFILE_COSMETICS.find((c) => c.slug === slug)
}

export function sanitizeGiftMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().slice(0, GIFT_MESSAGE_MAX)
  return trimmed.length > 0 ? trimmed : null
}
