export const SEEDANCE_MODEL_KEYS = ['fast', 'lite'] as const

export type SeedanceModelKey = (typeof SEEDANCE_MODEL_KEYS)[number]

export interface SeedanceModelConfig {
  key: SeedanceModelKey
  id: string
  label: string
  baseCoins: number
  resolution: '480p'
}

export const SEEDANCE_MODELS: Record<SeedanceModelKey, SeedanceModelConfig> = {
  fast: {
    key: 'fast',
    id: 'bytedance/seedance-2.0-fast',
    label: 'Fast',
    baseCoins: 10,
    resolution: '480p',
  },
  lite: {
    key: 'lite',
    id: 'bytedance/seedance-1-5-pro',
    label: 'Lite',
    baseCoins: 5,
    resolution: '480p',
  },
}

export const DEFAULT_SEEDANCE_MODEL: SeedanceModelKey = 'fast'

export function resolveSeedanceModel(input: unknown): SeedanceModelConfig {
  if (typeof input === 'string' && input in SEEDANCE_MODELS) {
    return SEEDANCE_MODELS[input as SeedanceModelKey]
  }
  if (typeof input === 'string') {
    const byId = Object.values(SEEDANCE_MODELS).find((m) => m.id === input)
    if (byId) return byId
  }
  return SEEDANCE_MODELS[DEFAULT_SEEDANCE_MODEL]
}

export function extractOpenRouterJobId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null
  const match = videoUrl.match(/\/api\/video\/([^/]+)\/content/)
  return match?.[1] || null
}
