export type CreativeRow = 'camera' | 'lighting' | 'mood' | 'pace' | 'motion'

export type CreativeSelections = Record<CreativeRow, string>

export interface CreativeOption {
  id: string
  label: string
  fragment: string
}

export interface CreativeRowConfig {
  id: CreativeRow
  label: string
  options: CreativeOption[]
}

export const DEFAULT_CREATIVE_SELECTIONS: CreativeSelections = {
  camera: 'orbit',
  lighting: 'gold-rim',
  mood: 'luxury',
  pace: 'medium',
  motion: 'locked-subject',
}

export const CREATIVE_ROWS: CreativeRowConfig[] = [
  {
    id: 'camera',
    label: 'Camera',
    options: [
      { id: 'static', label: 'Static', fragment: 'locked-off static camera, stable framing' },
      { id: 'orbit', label: 'Orbit', fragment: 'slow orbiting camera around subject' },
      { id: 'push-in', label: 'Push-in', fragment: 'smooth dolly push-in toward subject' },
      { id: 'whip-pan', label: 'Whip-pan', fragment: 'dynamic whip-pan with kinetic energy' },
      { id: 'low-angle', label: 'Low angle', fragment: 'low-angle hero shot looking up at subject' },
      { id: 'top-down', label: 'Top-down', fragment: 'top-down overhead camera perspective' },
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    options: [
      { id: 'soft-studio', label: 'Soft studio', fragment: 'soft studio lighting, clean highlights' },
      { id: 'gold-rim', label: 'Gold rim', fragment: 'gold rim light, luxury contrast' },
      { id: 'neon-night', label: 'Neon night', fragment: 'neon night lighting, urban glow' },
      { id: 'harsh-flash', label: 'Harsh flash', fragment: 'harsh flash photography, bold shadows' },
      { id: 'sunset', label: 'Sunset', fragment: 'warm sunset golden hour lighting' },
    ],
  },
  {
    id: 'mood',
    label: 'Mood',
    options: [
      { id: 'luxury', label: 'Luxury', fragment: 'luxury hip-hop energy, premium polish' },
      { id: 'hype', label: 'Hype', fragment: 'high-energy hype, bold and explosive' },
      { id: 'moody', label: 'Moody', fragment: 'moody atmospheric tone, cinematic depth' },
      { id: 'clean-product', label: 'Clean product', fragment: 'clean product showcase, minimal distraction' },
      { id: 'street', label: 'Street', fragment: 'raw street aesthetic, authentic urban grit' },
    ],
  },
  {
    id: 'pace',
    label: 'Pace',
    options: [
      { id: 'slow', label: 'Slow cinematic', fragment: 'smooth slow motion, 24fps cinematic feel' },
      { id: 'medium', label: 'Medium', fragment: 'balanced pacing, natural motion flow' },
      { id: 'fast', label: 'Fast cuts', fragment: 'fast-cut rhythm, punchy transitions' },
    ],
  },
  {
    id: 'motion',
    label: 'Motion',
    options: [
      { id: 'locked-subject', label: 'Locked subject', fragment: 'subject holds identity; subtle body motion' },
      { id: 'walking', label: 'Walking', fragment: 'subject walking with confident stride' },
      { id: 'dance', label: 'Dance energy', fragment: 'dance energy, rhythmic body movement' },
      { id: 'product-spin', label: 'Product spin', fragment: 'product spin reveal, elegant rotation' },
    ],
  },
]

const optionMap = new Map<string, CreativeOption>()
for (const row of CREATIVE_ROWS) {
  for (const option of row.options) {
    optionMap.set(`${row.id}:${option.id}`, option)
  }
}

export function normalizeCreativeSelections(
  input: Partial<CreativeSelections> | null | undefined
): CreativeSelections {
  const result = { ...DEFAULT_CREATIVE_SELECTIONS }
  if (!input) return result

  for (const row of CREATIVE_ROWS) {
    const value = input[row.id]
    if (typeof value === 'string' && optionMap.has(`${row.id}:${value}`)) {
      result[row.id] = value
    }
  }

  return result
}

export function getCreativeFragments(selections: CreativeSelections): string[] {
  return CREATIVE_ROWS.map((row) => {
    const option = optionMap.get(`${row.id}:${selections[row.id]}`)
    return option?.fragment ?? ''
  }).filter(Boolean)
}

export function buildAdPromptFromBrief(
  brief: string,
  selections: CreativeSelections
): string {
  const trimmedBrief = brief.trim()
  const fragments = getCreativeFragments(selections)

  const parts = [
    trimmedBrief,
    ...fragments,
    'DMF luxury hip-hop brand aesthetic, gold and black palette, premium commercial quality.',
  ].filter(Boolean)

  return parts.join('. ').replace(/\.\s*\./g, '.')
}
