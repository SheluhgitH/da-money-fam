export const SEEDANCE_MODEL_KEYS = ['lite', 'mini', 'fast'] as const

export type SeedanceModelKey = (typeof SEEDANCE_MODEL_KEYS)[number]
export type SeedanceResolution = '480p' | '720p'

export interface SeedanceModelConfig {
  key: SeedanceModelKey
  id: string
  label: string
  baseCoins: number
  resolution: SeedanceResolution
  resolutions: SeedanceResolution[]
  durations: number[]
  supportsAudio: boolean
  supportsLastFrame: boolean
}

export const SEEDANCE_MODELS: Record<SeedanceModelKey, SeedanceModelConfig> = {
  lite: {
    key: 'lite',
    id: 'bytedance/seedance-1-5-pro',
    label: 'Lite',
    baseCoins: 6,
    resolution: '480p',
    resolutions: ['480p'],
    durations: [6, 8, 10],
    supportsAudio: true,
    supportsLastFrame: true,
  },
  mini: {
    key: 'mini',
    id: 'bytedance/seedance-2.0-mini',
    label: 'Mini',
    baseCoins: 8,
    resolution: '480p',
    resolutions: ['480p', '720p'],
    durations: [4, 6, 8, 10, 12],
    supportsAudio: true,
    supportsLastFrame: true,
  },
  fast: {
    key: 'fast',
    id: 'bytedance/seedance-2.0-fast',
    label: 'Fast',
    baseCoins: 16,
    resolution: '480p',
    resolutions: ['480p'],
    durations: [6, 8, 10],
    supportsAudio: true,
    supportsLastFrame: true,
  },
}

export const DEFAULT_SEEDANCE_MODEL: SeedanceModelKey = 'mini'

export function resolveSubmitResolution(
  model: SeedanceModelConfig,
  requested: unknown
): SeedanceResolution {
  if (requested === '720p' && model.resolutions.includes('720p')) return '720p'
  return '480p'
}

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

export function audioAddonCoins(baseCoins: number): number {
  return Math.max(1, Math.ceil(baseCoins * 0.75))
}
