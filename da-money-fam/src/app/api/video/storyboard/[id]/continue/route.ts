import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration, updateAdStudioGeneration } from '@/lib/ad-studio-jobs'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { submitSeedanceJob } from '@/lib/seedance-submit'
import { resolveSeedanceModel, resolveSubmitResolution } from '@/lib/seedance-models'
import { extractAndUploadLastFrame } from '@/lib/storyboard-last-frame'
import { composeVideoFirstFrame } from '@/lib/compose-video-first-frame'
import { appendStoryboardContinuity } from '@/lib/storyboard-prompts'
import {
  appearsLaterUrls,
  classifyReferenceRoles,
  openingSubjectUrls,
} from '@/lib/classify-reference-roles'
import { toInputReferences } from '@/lib/seedance-submit'

export const maxDuration = 120

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gen = await getAdStudioGeneration(user.id, params.id)
  if (!gen || gen.mode !== 'storyboard') {
    return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    first_frame_image,
    previous_video_url,
    reference_images,
    enhance,
    generate_audio,
    resolution,
  } = body

  const nextIndex = gen.scenes.findIndex(
    (s) =>
      s.status !== 'completed' &&
      (!s.jobId || s.status === 'pending' || s.status === 'failed')
  )
  if (nextIndex < 0) {
    return NextResponse.json({ error: 'All scenes already started' }, { status: 400 })
  }

  const clientFirstFrame =
    typeof first_frame_image === 'string' && first_frame_image.length > 0
      ? first_frame_image
      : ''

  let extractedFrame = ''
  if (!clientFirstFrame) {
    const fromBody = typeof previous_video_url === 'string' ? previous_video_url : ''
    const prev =
      fromBody ||
      [...gen.scenes]
        .slice(0, nextIndex)
        .reverse()
        .find((s) => s.videoUrl)?.videoUrl
    if (prev) {
      extractedFrame =
        (await extractAndUploadLastFrame({
          userId: user.id,
          videoUrl: prev,
          requestOrigin: new URL(req.url).origin,
        })) || ''
    }
  }

  const continuityFrame = clientFirstFrame || extractedFrame || ''
  const scene = gen.scenes[nextIndex]
  const sceneCount = gen.scenes.length
  const creative = gen.creative as Partial<CreativeSelections> | null
  const isLastScene = nextIndex === sceneCount - 1
  const refUrls = toInputReferences(reference_images).map((r) => r.image_url.url)
  const classified = refUrls.length
    ? await classifyReferenceRoles({
        brief: scene.brief,
        urls: refUrls,
        overrides: (() => {
          const out: Record<string, 'opening_subject' | 'appears_later' | 'identity'> = {}
          if (!Array.isArray(reference_images)) return out
          for (const item of reference_images) {
            if (!item || typeof item !== 'object') continue
            const rec = item as { url?: unknown; refRole?: unknown }
            if (typeof rec.url !== 'string') continue
            if (
              rec.refRole === 'opening_subject' ||
              rec.refRole === 'appears_later' ||
              rec.refRole === 'identity'
            ) {
              out[rec.url] = rec.refRole
            }
          }
          return out
        })(),
      })
    : { roles: [], shotPlan: '' }
  const later = appearsLaterUrls(classified.roles)
  const laterHint =
    isLastScene && later.length
      ? ' Feature the later subjects (product / secondary cast) as living subjects in this shot; keep identity from refs.'
      : nextIndex === 0
        ? ''
        : later.length
          ? ' You may begin introducing later subjects if the brief calls for it; keep them out of a cold open.'
          : ''
  const continuityBrief = appendStoryboardContinuity(
    `${scene.brief}. Scene ${nextIndex + 1} of ${sceneCount} in a continuous ad storyboard. Continue seamlessly from the previous shot.${laterHint}`,
    { walking: creative?.motion === 'walking' }
  )
  const model = resolveSeedanceModel(gen.model)

  // Only compose when we have no continuity frame — never replace the last frame.
  let composedFirst: string | null = null
  if (!continuityFrame) {
    const openUrls = openingSubjectUrls(classified.roles)
    composedFirst = await composeVideoFirstFrame({
      userId: user.id,
      brief: continuityBrief,
      aspectRatio: gen.aspect_ratio || '9:16',
      referenceImages: reference_images,
      openingRefUrls: openUrls.length ? openUrls : undefined,
    })
  }

  const firstFrame = continuityFrame || composedFirst || null

  try {
    const result = await submitSeedanceJob({
      brief: continuityBrief,
      creative,
      enhance: enhance === true,
      duration: gen.duration_seconds,
      aspect_ratio: gen.aspect_ratio,
      reference_images: reference_images,
      first_frame_image: firstFrame,
      generate_audio: generate_audio === true,
      model: model.key,
      ignoreRefFrames: true,
      storyboardMode: true,
      resolution: resolveSubmitResolution(model, resolution),
      shotPlan: classified.shotPlan || null,
    })

    const scenes = gen.scenes.map((s, i) =>
      i === nextIndex ? { ...s, jobId: result.jobId, status: 'processing' } : s
    )

    await updateAdStudioGeneration(user.id, gen.id, {
      scenes,
      status: 'processing',
    })

    return NextResponse.json({
      storyboardId: gen.id,
      sceneIndex: nextIndex,
      jobId: result.jobId,
    })
  } catch (error: unknown) {
    console.error('Storyboard continue error:', error)
    const message = error instanceof Error ? error.message : 'Failed to continue storyboard'
    return NextResponse.json({ error: 'Storyboard Error', details: message }, { status: 502 })
  }
}
