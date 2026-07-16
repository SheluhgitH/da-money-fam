export type ServicePackage = {
  slug: string
  title: string
  fullPrice: number
  depositAmount: number
  description: string
}

export const SERVICE_PACKAGES: Record<string, ServicePackage> = {
  'social-reels': {
    slug: 'social-reels',
    title: 'Social Reels',
    fullPrice: 150,
    depositAmount: 75,
    description: 'Fast-paced vertical edits for TikTok/IG.',
  },
  'youtube-content': {
    slug: 'youtube-content',
    title: 'YouTube Content',
    fullPrice: 300,
    depositAmount: 150,
    description: 'Long-form content with motion graphics and cleanup.',
  },
  'video-commercials': {
    slug: 'video-commercials',
    title: 'Video Commercials',
    fullPrice: 500,
    depositAmount: 250,
    description: 'High-impact commercial cuts with color and sound.',
  },
  'short-films': {
    slug: 'short-films',
    title: 'Short Films',
    fullPrice: 1200,
    depositAmount: 600,
    description: 'Cinematic narrative editing and color.',
  },
}

export function getServicePackage(slug: string): ServicePackage | null {
  return SERVICE_PACKAGES[slug] ?? null
}
