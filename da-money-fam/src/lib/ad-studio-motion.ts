export type MotionMode = 'guide' | 'lock_start' | 'animate_ab'
export type IdentityStrength = 'loose' | 'balanced' | 'locked'

export const MOTION_MODES: Array<{
  id: MotionMode
  label: string
  hint: string
}> = [
  {
    id: 'guide',
    label: 'Guide',
    hint: 'Stills shape identity and timing. The model invents a cinematic open.',
  },
  {
    id: 'lock_start',
    label: 'Lock start',
    hint: 'Your Start still is the frozen first frame. Motion begins from that image.',
  },
  {
    id: 'animate_ab',
    label: 'Animate A→B',
    hint: 'Video starts on one still and ends on another. Mark Start and End refs.',
  },
]

export const IDENTITY_STRENGTHS: Array<{
  id: IdentityStrength
  label: string
  hint: string
  suffix: string
}> = [
  {
    id: 'loose',
    label: 'Loose',
    hint: 'Freer styling; identity can drift slightly.',
    suffix: 'Allow stylized interpretation of the subject while keeping them recognizable.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    hint: 'Keep face and wardrobe consistent without freezing the shot.',
    suffix: 'Preserve face, skin tone, and wardrobe from references; natural motion OK.',
  },
  {
    id: 'locked',
    label: 'Locked',
    hint: 'Strong face/wardrobe lock across the whole clip.',
    suffix:
      'Strict identity lock: same face, hair, skin, and wardrobe as references throughout. Do not invent a different person.',
  },
]

export function parseMotionMode(input: unknown): MotionMode {
  if (input === 'lock_start' || input === 'animate_ab' || input === 'guide') return input
  return 'guide'
}

export function parseIdentityStrength(input: unknown): IdentityStrength {
  if (input === 'loose' || input === 'locked' || input === 'balanced') return input
  return 'balanced'
}

export function identityStrengthSuffix(strength: IdentityStrength): string {
  return IDENTITY_STRENGTHS.find((s) => s.id === strength)?.suffix || IDENTITY_STRENGTHS[1].suffix
}

/** Pull explicit first/last frame URLs from reference list. */
export function framesFromReferences(refSource: unknown): {
  firstUrl: string | null
  lastUrl: string | null
} {
  let firstUrl: string | null = null
  let lastUrl: string | null = null
  if (!Array.isArray(refSource)) return { firstUrl, lastUrl }
  for (const item of refSource) {
    if (!item || typeof item !== 'object') continue
    const rec = item as {
      url?: unknown
      kind?: unknown
      useAsFirstFrame?: unknown
      useAsLastFrame?: unknown
    }
    if (rec.kind === 'audio') continue
    if (typeof rec.url !== 'string' || !rec.url) continue
    if (rec.useAsFirstFrame === true && !firstUrl) firstUrl = rec.url
    if (rec.useAsLastFrame === true && !lastUrl) lastUrl = rec.url
  }
  return { firstUrl, lastUrl }
}
