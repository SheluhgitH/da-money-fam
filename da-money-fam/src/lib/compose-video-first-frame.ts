import { generateOpenRouterImage } from '@/lib/openrouter-images'
import { toInputReferences } from '@/lib/seedance-submit'

function stillUrls(refs: unknown, extra?: string[]): string[] {
  const fromRefs = toInputReferences(refs).map((r) => r.image_url.url)
  const extras = (extra || []).filter((u) => u.startsWith('http://') || u.startsWith('https://'))
  return Array.from(new Set([...fromRefs, ...extras])).slice(0, 4)
}

export async function composeVideoFirstFrame(input: {
  userId: string
  brief: string
  aspectRatio?: string
  referenceImages?: unknown
  extraRefUrls?: string[]
  /** When set, only these URLs are used for the opening compose (opening subjects). */
  openingRefUrls?: string[]
}): Promise<string | null> {
  const all = stillUrls(input.referenceImages, input.extraRefUrls)
  const refs =
    Array.isArray(input.openingRefUrls) && input.openingRefUrls.length > 0
      ? input.openingRefUrls
          .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
          .slice(0, 4)
      : all
  if (refs.length === 0) return null

  const scene = input.brief.trim() || 'Cinematic opening shot'
  const prompt = [
    'Generate a single high-quality cinematic OPENING FRAME for a video ad.',
    `Match this scene exactly: ${scene}`,
    'Place ONLY the opening subject(s) from the attached reference stills INTO this environment as living subjects (full or three-quarter body as the scene requires).',
    'Do NOT include products, bottles, packaging, or secondary cast that should appear later in the video.',
    'Keep each opening person consistent: same face, skin, hair, age, and wardrobe as their reference.',
    'Do not copy a studio headshot, character sheet, grid, or cropped portrait as the whole frame.',
    'No text, logos, watermarks, or UI.',
    'Photoreal lighting, sharp, premium commercial still.',
  ].join(' ')

  try {
    const result = await generateOpenRouterImage({
      tier: 'smart',
      prompt,
      aspectRatio: input.aspectRatio || '9:16',
      inputReferences: refs,
      userId: input.userId,
    })
    return result.url
  } catch (err) {
    console.error('composeVideoFirstFrame failed:', err)
    return null
  }
}
