import { resolveAdPrompt } from '@/lib/ad-prompt-enhance'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { mapSeedanceUserError } from '@/lib/seedance-errors'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  resolveSubmitResolution,
  type SeedanceModelKey,
} from '@/lib/seedance-models'

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

function frameFromRef(
  images: unknown,
  frameType: 'first_frame' | 'last_frame'
): FrameImage | null {
  if (!Array.isArray(images)) return null

  for (const item of images) {
    if (!item || typeof item !== 'object') continue
    const record = item as {
      url?: unknown
      useAsFirstFrame?: unknown
      use_as_first_frame?: unknown
      useAsLastFrame?: unknown
      use_as_last_frame?: unknown
    }
    const url = record.url
    const useFirst = record.useAsFirstFrame === true || record.use_as_first_frame === true
    const useLast = record.useAsLastFrame === true || record.use_as_last_frame === true
    const match = frameType === 'first_frame' ? useFirst : useLast
    if (match && typeof url === 'string' && url.length > 0) {
      return {
        type: 'image_url',
        image_url: { url },
        frame_type: frameType,
      }
    }
  }

  return null
}

export function toFirstFrameImage(images: unknown): FrameImage | null {
  return frameFromRef(images, 'first_frame')
}

export function toLastFrameImage(images: unknown): FrameImage | null {
  return frameFromRef(images, 'last_frame')
}

export function normalizeDuration(
  duration_seconds: unknown,
  modelKey?: SeedanceModelKey | string | null
): number {
  const model = resolveSeedanceModel(modelKey ?? DEFAULT_SEEDANCE_MODEL)
  const n = Number(duration_seconds)
  return model.durations.includes(n) ? n : model.durations.includes(6) ? 6 : model.durations[0]
}

export async function submitSeedanceJob(input: {
  brief: string
  creative?: Partial<CreativeSelections> | null
  enhance?: boolean
  enhancedPrompt?: string | null
  duration: number
  aspect_ratio?: string
  reference_images?: unknown
  first_frame_image?: string | null
  last_frame_image?: string | null
  generate_audio?: boolean
  resolution?: '480p' | '720p' | string | null
  model?: SeedanceModelKey | string | null
  /** When chaining storyboard shots, only explicit first_frame_image is used. */
  ignoreRefFrames?: boolean
}): Promise<{ jobId: string; pollingUrl?: string; modelId: string }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    throw new Error('OpenRouter API Key not configured')
  }

  const model = resolveSeedanceModel(input.model ?? DEFAULT_SEEDANCE_MODEL)
  const firstFrameFromRefs = input.ignoreRefFrames
    ? null
    : toFirstFrameImage(input.reference_images)
  const lastFrameFromRefs =
    input.ignoreRefFrames || !model.supportsLastFrame
      ? null
      : toLastFrameImage(input.reference_images)
  const explicitFirstFrame =
    typeof input.first_frame_image === 'string' && input.first_frame_image.length > 0
      ? ({
          type: 'image_url' as const,
          image_url: { url: input.first_frame_image },
          frame_type: 'first_frame' as const,
        } satisfies FrameImage)
      : null
  const explicitLastFrame =
    model.supportsLastFrame &&
    typeof input.last_frame_image === 'string' &&
    input.last_frame_image.length > 0
      ? ({
          type: 'image_url' as const,
          image_url: { url: input.last_frame_image },
          frame_type: 'last_frame' as const,
        } satisfies FrameImage)
      : null
  const firstFrame = explicitFirstFrame ?? firstFrameFromRefs
  const lastFrame = explicitLastFrame ?? lastFrameFromRefs

  const frame_images: FrameImage[] = []
  if (firstFrame) frame_images.push(firstFrame)
  if (lastFrame && lastFrame.image_url.url !== firstFrame?.image_url.url) {
    frame_images.push(lastFrame)
  }

  const frameUrls = new Set(frame_images.map((f) => f.image_url.url))
  const inputReferences = toInputReferences(input.reference_images).filter(
    (ref) => !frameUrls.has(ref.image_url.url)
  )

  const refUrls = toInputReferences(input.reference_images).map((r) => r.image_url.url)
  let finalPrompt = await resolveAdPrompt({
    brief: input.brief,
    creative: input.creative,
    enhance: input.enhance === true,
    referenceUrls: refUrls,
    enhancedPrompt: input.enhancedPrompt,
  })
  if (inputReferences.length > 0 && frame_images.length === 0) {
    finalPrompt = `${finalPrompt} Do not use the reference image as the first frame or opening still. Start on a new shot that matches this prompt. Use references only for identity, wardrobe, and style.`
  }

  const generateAudio = model.supportsAudio && input.generate_audio === true
  const duration = normalizeDuration(input.duration, model.key)

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
      duration,
      aspect_ratio: input.aspect_ratio || '9:16',
      resolution: resolveSubmitResolution(model, input.resolution),
      ...(generateAudio ? { generate_audio: true } : {}),
      ...(frame_images.length > 0 ? { frame_images } : {}),
      ...(inputReferences.length > 0 ? { input_references: inputReferences } : {}),
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    const rawDetail =
      data.error?.message || JSON.stringify(data.error) || 'Seedance rejected the request'
    throw new Error(
      mapSeedanceUserError(`${data.error?.code || ''} ${rawDetail}`)
    )
  }

  return { jobId: data.id, pollingUrl: data.polling_url, modelId: model.id }
}
