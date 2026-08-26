import { resolveAdPrompt } from '@/lib/ad-prompt-enhance'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { markImageUrlsForSeedance } from '@/lib/character-sheet-markup'
import { mapSeedanceUserError } from '@/lib/seedance-errors'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  resolveSubmitResolution,
  type SeedanceModelKey,
} from '@/lib/seedance-models'
import { STORYBOARD_PHYSICS_SUFFIX } from '@/lib/storyboard-prompts'

const MAX_REFERENCE_IMAGES = 3

type ImageRef = { type: 'image_url'; image_url: { url: string } }
type AudioRef = { type: 'audio_url'; audio_url: { url: string } }
type FrameImage = ImageRef & { frame_type: 'first_frame' | 'last_frame' }

function isAudioItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false
  const rec = item as { kind?: unknown; type?: unknown }
  return rec.kind === 'audio' || rec.type === 'audio_url'
}

export function toInputReferences(images: unknown): ImageRef[] {
  if (!Array.isArray(images)) return []

  return images
    .filter((item) => !isAudioItem(item))
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

export function toAudioReferences(images: unknown): AudioRef[] {
  if (!Array.isArray(images)) return []
  const urls: string[] = []
  for (const item of images) {
    if (!isAudioItem(item)) continue
    if (item && typeof item === 'object' && 'url' in item) {
      const url = (item as { url?: unknown }).url
      if (typeof url === 'string' && url.startsWith('http')) urls.push(url)
    }
  }
  return urls.slice(0, 3).map((url) => ({
    type: 'audio_url' as const,
    audio_url: { url },
  }))
}

function frameFromRef(
  images: unknown,
  frameType: 'first_frame' | 'last_frame'
): FrameImage | null {
  if (!Array.isArray(images)) return null

  for (const item of images) {
    if (!item || typeof item !== 'object' || isAudioItem(item)) continue
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
  /** Storyboard scenes: refs are identity/style unless user locked a first/last frame. */
  storyboardMode?: boolean
  /** Timing plan from reference role classifier (appended to prompt). */
  shotPlan?: string | null
}): Promise<{ jobId: string; pollingUrl?: string; modelId: string }> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openRouterApiKey || openRouterApiKey === 'your_openrouter_key_here') {
    throw new Error('OpenRouter API Key not configured')
  }

  const model = resolveSeedanceModel(input.model ?? DEFAULT_SEEDANCE_MODEL)
  const explicitFirstFrame =
    typeof input.first_frame_image === 'string' && input.first_frame_image.length > 0
      ? ({
          type: 'image_url' as const,
          image_url: { url: input.first_frame_image },
          frame_type: 'first_frame' as const,
        } satisfies FrameImage)
      : null
  const skipRefFrames = Boolean(
    input.ignoreRefFrames || input.storyboardMode || explicitFirstFrame
  )
  const firstFrameFromRefs = skipRefFrames
    ? null
    : toFirstFrameImage(input.reference_images)
  const lastFrameFromRefs =
    skipRefFrames || !model.supportsLastFrame
      ? null
      : toLastFrameImage(input.reference_images)
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
  const audioReferences = toAudioReferences(input.reference_images)

  if (audioReferences.length > 0 && inputReferences.length === 0 && frame_images.length === 0) {
    throw new Error('Add at least one still with the audio track.')
  }

  const refUrls = toInputReferences(input.reference_images).map((r) => r.image_url.url)
  let finalPrompt = await resolveAdPrompt({
    brief: input.brief,
    creative: input.creative,
    enhance: input.enhance === true,
    referenceUrls: refUrls,
    enhancedPrompt: input.enhancedPrompt,
  })
  if (inputReferences.length > 0 && frame_images.length === 0) {
    finalPrompt = input.storyboardMode
      ? `${finalPrompt} Place the people and wardrobe from the reference images inside this scene as living subjects. Do not open on a frozen still of a reference photo. Start on a new cinematic shot that matches this prompt. Use references only for identity, wardrobe, and style.`
      : `${finalPrompt} Do not use the reference image as the first frame or opening still. Start on a new shot that matches this prompt. Use references only for identity, wardrobe, and style.`
  }

  if (input.storyboardMode) {
    finalPrompt = `${finalPrompt} ${STORYBOARD_PHYSICS_SUFFIX}`
  }

  if (typeof input.shotPlan === 'string' && input.shotPlan.trim()) {
    finalPrompt = `${finalPrompt} Shot timing: ${input.shotPlan.trim()}`
  }

  if (audioReferences.length > 0) {
    finalPrompt = `${finalPrompt} Follow @Audio1 for soundtrack, rhythm, and timing.`
  }

  const generateAudio =
    (model.supportsAudio && input.generate_audio === true) || audioReferences.length > 0
  const duration = normalizeDuration(input.duration, model.key)

  if (model.key === 'mini' || model.key === 'fast') {
    const urlsToMark = inputReferences.map((r) => r.image_url.url)
    const marked = await markImageUrlsForSeedance(urlsToMark)
    for (const ref of inputReferences) {
      ref.image_url.url = marked.get(ref.image_url.url) || ref.image_url.url
    }
  }

  const mixedReferences = [...inputReferences, ...audioReferences]

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
      ...(mixedReferences.length > 0 ? { input_references: mixedReferences } : {}),
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
