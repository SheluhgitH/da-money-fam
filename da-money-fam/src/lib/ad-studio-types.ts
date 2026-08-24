export type AdStudioMode = 'single' | 'storyboard'

export interface AdReferenceImage {
  url: string
  useAsFirstFrame: boolean
  useAsLastFrame?: boolean
}

export interface AdVideoPricingResponse {
  priceCoins: number
  totalPriceCoins: number
  balance: number
  canAfford: boolean
  discountPercent: number
  tierOrFanClub: string | null
  isAuthenticated: boolean
  fanClub?: boolean
  canEnhance?: boolean
  scenes: number
  variations: number
  durationSeconds?: number
  model?: string
  modelId?: string
  baseCoins?: number
  baseCoinsBeforeDiscount?: number
  generateAudio?: boolean
  audioAddonCoins?: number
  resolution?: '480p' | '720p'
  resolutions?: Array<'480p' | '720p'>
  modelPrices?: {
    lite: { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon?: number }
    mini: { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon?: number }
    fast: { priceCoins: number; baseCoinsBeforeDiscount: number; audioAddon?: number }
  }
  durationPrices?: Record<
    number,
    { priceCoins: number; baseCoinsBeforeDiscount: number }
  >
}

export interface StoryboardScene {
  brief: string
  jobId?: string | null
  videoUrl?: string | null
  status?: string
}

export interface AdStudioGeneration {
  id: string
  user_id: string
  mode: AdStudioMode
  brief: string | null
  scenes: StoryboardScene[]
  creative: Record<string, string> | null
  aspect_ratio: string
  duration_seconds: number
  video_urls: string[]
  thumbnail_url: string | null
  coinz_spent: number
  status: string
  featured: boolean
  model: string
  created_at: string
  admin_hidden?: boolean
  admin_notes?: string | null
  refunded_at?: string | null
  refund_coinz?: number
}

export interface AdStudioShowcaseItem {
  id: string
  videoUrl: string
  /** JPEG/WebP poster when available */
  thumbnailUrl?: string | null
  aspect_ratio: string
  created_at: string
}

export const ASPECT_CLASS: Record<string, string> = {
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
}

export const MAX_REFERENCE_IMAGES = 3
export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024
export const MAX_STORYBOARD_SCENES = 5
export const MIN_STORYBOARD_SCENES = 2
export const MAX_CONCURRENT_GENERATIONS = 2

export interface AdStudioPreset {
  id: string
  user_id: string
  name: string
  brief: string | null
  creative: Record<string, string> | null
  aspect_ratio: string
  model: string | null
  duration_seconds: number
  look_ref_urls?: string[]
  look_character_id?: string | null
  created_at: string
  updated_at: string
}

export interface QueuedGenerationJob {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  label: string
  error?: string | null
  startedAt?: number
}
