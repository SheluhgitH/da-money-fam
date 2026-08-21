export const IMAGE_TIERS = ['draft', 'fast', 'edit', 'smart'] as const
export type ImageTier = (typeof IMAGE_TIERS)[number]

export interface ImageModelConfig {
  tier: ImageTier
  id: string
  label: string
  /** Floor Coinz charge (post-rebase) */
  baseCoins: number
  /** Approximate provider USD for margin math */
  usdEstimate: number
  mode: 'generate' | 'edit' | 'both'
  fallbackIds: string[]
  imageConfig?: Record<string, unknown>
}

export const IMAGE_MODELS: Record<ImageTier, ImageModelConfig> = {
  draft: {
    tier: 'draft',
    id: 'black-forest-labs/flux.2-klein-4b',
    label: 'Draft',
    baseCoins: 4,
    usdEstimate: 0.014,
    mode: 'generate',
    fallbackIds: ['krea/krea-2-medium-turbo', 'qwen/qwen-image'],
  },
  fast: {
    tier: 'fast',
    id: 'krea/krea-2-medium-turbo',
    label: 'Fast',
    baseCoins: 4,
    usdEstimate: 0.015,
    mode: 'generate',
    fallbackIds: ['black-forest-labs/flux.2-klein-4b', 'qwen/qwen-image'],
  },
  edit: {
    tier: 'edit',
    id: 'sourceful/riverflow-v2.5-fast',
    label: 'Edit',
    baseCoins: 6,
    usdEstimate: 0.025,
    mode: 'edit',
    fallbackIds: ['recraft/recraft-v4.1-utility', 'google/gemini-3.1-flash-lite-image'],
    imageConfig: { reasoning: 'low' },
  },
  smart: {
    tier: 'smart',
    id: 'google/gemini-3.1-flash-lite-image',
    label: 'Smart',
    baseCoins: 10,
    usdEstimate: 0.04,
    mode: 'both',
    fallbackIds: ['google/gemini-2.5-flash-image', 'sourceful/riverflow-v2.5-fast'],
    imageConfig: { resolution: '1K' },
  },
}

export const DEFAULT_IMAGE_TIER: ImageTier = 'fast'

export function resolveImageModel(input: unknown): ImageModelConfig {
  if (typeof input === 'string' && input in IMAGE_MODELS) {
    return IMAGE_MODELS[input as ImageTier]
  }
  if (typeof input === 'string') {
    const byId = Object.values(IMAGE_MODELS).find((m) => m.id === input)
    if (byId) return byId
  }
  return IMAGE_MODELS[DEFAULT_IMAGE_TIER]
}

export function imageModelChain(tier: ImageTier): string[] {
  const model = IMAGE_MODELS[tier]
  return [model.id, ...model.fallbackIds]
}
