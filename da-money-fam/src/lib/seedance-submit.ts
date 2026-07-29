import { resolveAdPrompt } from '@/lib/ad-prompt-enhance'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  type SeedanceModelKey,
} from '@/lib/seedance-models'

const ALLOWED_DURATIONS = new Set([6, 8, 10])
const MAX_REFERENCE_IMAGES = 3

type ImageRef = { type: 'image_url'; image_url: { url: string } }
type FrameImage = ImageRef & { frame_type: 'first_frame' | 'last_frame' }

export function toInputReferences(images: unknown): ImageRef[] {
  if (!Array.isArray(images)) return []

  return images
    .map((item) => {
      if (typeof item === 'string' && item.length > 0) return item
      if (item && typeof item === 'object' && 'url' in item) {
        const url = (item as { url?: unknown }).url
        if (typeof url === 'string' && url.length > 0) return url
      }
      return null
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_REFERENCE_IMAGES)
    .map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    }))
}

export function toFirstFrameImage(images: unknown): FrameImage | null {
  if (!Array.isArray(images)) return null

  for (const item of images) {
    if (!item || typeof item !== 'object') continue
    const record = item as { url?: unknown; useAsFirstFrame?: unknown; use_as_first_frame?: unknown }
    const url = record.url
    const useFirst = record.useAsFirstFrame === true || record.use_as_first_frame === true
    if (useFirst && typeof url === 'string' && url.length > 0) {
      return {
        type: 'image_url',
        image_url: { url },
        frame_type: 'first_frame',
      }
    }
  }

  return null
}

export function normalizeDuration(duration_seconds: unknown): number {
  return ALLOWED_DURATIONS.has(Number(duration_seconds)) ? Number(duration_seconds) : 6
}

export async function submitSeedanceJob(input: {
  brief: string
  creative?: Partial<CreativeSelections> | null
  enhance?: boolean
  duration: number
  aspect_ratio?: string
  reference_images?: unknown
  first_frame_image?: string | null
  model?: SeedanceModelKey | string | null
}): Promise<{ jobId: string; pollingUrl?: string; modelId: string }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    throw new Error('OpenRouter API Key not configured')
  }

  const model = resolveSeedanceModel(input.model ?? DEFAULT_SEEDANCE_MODEL)
  const inputReferences = toInputReferences(input.reference_images)
  const firstFrameFromRefs = toFirstFrameImage(input.reference_images)
  const explicitFirstFrame =
    typeof input.first_frame_image === 'string' && input.first_frame_image.length > 0
      ? ({
          type: 'image_url' as const,
          image_url: { url: input.first_frame_image },
          frame_type: 'first_frame' as const,
        } satisfies FrameImage)
      : null
  const firstFrame = explicitFirstFrame ?? firstFrameFromRefs

  const finalPrompt = await resolveAdPrompt({
    brief: input.brief,
    creative: input.creative,
    enhance: input.enhance === true,
  })

  const response = await fetch('https://openrouter.ai/api/v1/videos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterApiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005',
      'X-Title': 'DMF Ad Studio',
    },
    body: JSON.stringify({
      model: model.id,
      prompt: finalPrompt,
      duration: input.duration,
      aspect_ratio: input.aspect_ratio || '9:16',
      resolution: model.resolution,
      ...(firstFrame ? { frame_images: [firstFrame] } : {}),
      ...(inputReferences.length > 0 ? { input_references: inputReferences } : {}),
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const rawDetail =
      data.error?.message || JSON.stringify(data.error) || 'Seedance rejected the request'
    throw new Error(rawDetail)
  }

  return { jobId: data.id, pollingUrl: data.polling_url, modelId: model.id }
}
