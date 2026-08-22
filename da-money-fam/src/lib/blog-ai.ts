import { completeAdPromptChat } from '@/lib/ad-prompt-llm'
import { isOpenRouterConfigured } from '@/lib/chat-models'

export type BlogAiMetadata = {
  excerpt: string
  slug: string
  content: string
  imagePrompt: string
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function parseBlogMetadataJson(raw: string): BlogAiMetadata | null {
  const trimmed = raw.trim()

  const tryParse = (text: string): BlogAiMetadata | null => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      const excerpt = typeof parsed.excerpt === 'string' ? parsed.excerpt.trim() : ''
      const content = typeof parsed.content === 'string' ? parsed.content.trim() : ''
      const slug =
        typeof parsed.slug === 'string' && parsed.slug.trim()
          ? parsed.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
          : ''
      const imagePrompt =
        typeof parsed.imagePrompt === 'string'
          ? parsed.imagePrompt.trim()
          : typeof parsed.image_prompt === 'string'
            ? parsed.image_prompt.trim()
            : ''
      if (!excerpt || !content || !imagePrompt) return null
      return {
        excerpt: excerpt.slice(0, 500),
        slug: (slug || slugify(excerpt)).slice(0, 80),
        content: content.slice(0, 12000),
        imagePrompt: imagePrompt.slice(0, 2000),
      }
    } catch {
      return null
    }
  }

  const direct = tryParse(trimmed)
  if (direct) return direct

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) {
    const fromFence = tryParse(fenced[1].trim())
    if (fromFence) return fromFence
  }

  const match = trimmed.match(/\{[\s\S]*"excerpt"[\s\S]*\}/)
  if (match) {
    const fromMatch = tryParse(match[0])
    if (fromMatch) return fromMatch
  }

  return null
}

export async function generateBlogPostFromTitle(input: {
  title: string
}): Promise<BlogAiMetadata> {
  if (!isOpenRouterConfigured()) {
    throw new Error('OpenRouter API Key not configured')
  }

  const title = input.title.trim()
  if (!title) throw new Error('Blog title is required')

  const system = `You write blog posts for Da Money Fam (DMF), a luxury hip-hop collective.
Return ONLY valid JSON (no markdown fences) with exactly these keys:
- excerpt: 1-2 sentence teaser for cards and SEO
- slug: url-friendly lowercase slug with hyphens only
- content: 3-5 short paragraphs; markdown ok; premium culture tone; no hashtags spam
- imagePrompt: detailed blog hero image prompt for an image model — wide cinematic 16:9 feel, luxury street aesthetic, NO text/logos/watermarks in the image`

  const user = `Blog post title: "${title}"

Generate excerpt, slug, content, and imagePrompt.`

  const raw = await completeAdPromptChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 1200 }
  )

  if (!raw) {
    throw new Error('AI blog generation failed — no response from models')
  }

  const parsed = parseBlogMetadataJson(raw)
  if (!parsed) {
    throw new Error('AI returned invalid blog JSON')
  }

  if (!parsed.slug) {
    parsed.slug = slugify(title)
  }

  return parsed
}
