import { completeAdPromptChat } from '@/lib/ad-prompt-llm'
import { isOpenRouterConfigured } from '@/lib/chat-models'

export type SongAiMetadata = {
  description: string
  genre: string
  imagePrompt: string
}

function parseSongMetadataJson(raw: string): SongAiMetadata | null {
  const trimmed = raw.trim()

  const tryParse = (text: string): SongAiMetadata | null => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>
      const description =
        typeof parsed.description === 'string' ? parsed.description.trim() : ''
      const genre = typeof parsed.genre === 'string' ? parsed.genre.trim() : ''
      const imagePrompt =
        typeof parsed.imagePrompt === 'string'
          ? parsed.imagePrompt.trim()
          : typeof parsed.image_prompt === 'string'
            ? parsed.image_prompt.trim()
            : ''
      if (!description || !imagePrompt) return null
      return {
        description: description.slice(0, 1000),
        genre: (genre || 'Hip-Hop').slice(0, 100),
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

  const match = trimmed.match(/\{[\s\S]*"description"[\s\S]*\}/)
  if (match) {
    const fromMatch = tryParse(match[0])
    if (fromMatch) return fromMatch
  }

  return null
}

export async function generateSongMetadataFromTitle(input: {
  title: string
  artist?: string
}): Promise<SongAiMetadata> {
  if (!isOpenRouterConfigured()) {
    throw new Error('OpenRouter API Key not configured')
  }

  const title = input.title.trim()
  if (!title) throw new Error('Song title is required')

  const artist = (input.artist || 'JackPot').trim() || 'JackPot'

  const system = `You write store metadata for Da Money Fam (DMF), a luxury hip-hop collective.
Return ONLY valid JSON (no markdown) with exactly these keys:
- description: 2-3 sentence store blurb, premium tone, no hashtags
- genre: single short genre label (e.g. Trap, Luxury Hip-Hop, R&B)
- imagePrompt: detailed album cover art prompt for an image model — square cover, cinematic lighting, luxury street aesthetic, NO text/logos/watermarks in the image`

  const user = `Song title: "${title}"
Artist: "${artist}"

Generate description, genre, and imagePrompt.`

  const raw = await completeAdPromptChat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { maxTokens: 600 }
  )

  if (!raw) {
    throw new Error('AI metadata generation failed — no response from models')
  }

  const parsed = parseSongMetadataJson(raw)
  if (!parsed) {
    throw new Error('AI returned invalid metadata JSON')
  }

  return parsed
}
