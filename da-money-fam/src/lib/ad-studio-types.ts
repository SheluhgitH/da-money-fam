export type AdStudioMode = 'single' | 'storyboard'

export interface AdReferenceImage {
  url: string
  useAsFirstFrame: boolean
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
  modelPrices?: {
    lite: { priceCoins: number; baseCoinsBeforeDiscount: number }
    fast: { priceCoins: number; baseCoinsBeforeDiscount: number }
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
}

export interface AdStudioShowcaseItem {
  id: string
  videoUrl: string
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
export const MAX_STORYBOARD_SCENES = 3
export const MIN_STORYBOARD_SCENES = 2
