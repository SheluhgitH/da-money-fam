export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover_image_url: string | null
  is_published: boolean
  published_at: string
  created_at: string
}

const WORDS_PER_MINUTE = 200

export function getReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}
