import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getAdStudioGeneration, updateAdStudioGeneration } from '@/lib/ad-studio-jobs'
import type { CreativeSelections } from '@/lib/ad-creative-presets'
import { submitSeedanceJob } from '@/lib/seedance-submit'
import { resolveSeedanceModel, resolveSubmitResolution } from '@/lib/seedance-models'

/**
 * Continue storyboard: generate next pending scene with optional first_frame from previous.
 * Coinz already debited at storyboard create.
 */
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

  const body = await req.json()
  const { first_frame_image, reference_images, enhance, generate_audio, resolution } = body

  const firstFrame =
    typeof first_frame_image === 'string' &&
    (first_frame_image.startsWith('http://') || first_frame_image.startsWith('https://'))
      ? first_frame_image
      : ''
  if (!firstFrame) {
    return NextResponse.json(
      { error: 'Previous scene last frame is required to continue' },
      { status: 400 }
    )
  }

  const nextIndex = gen.scenes.findIndex((s) => !s.jobId || s.status === 'pending')
  if (nextIndex < 0) {
    return NextResponse.json({ error: 'All scenes already started' }, { status: 400 })
  }

  const scene = gen.scenes[nextIndex]
  const sceneCount = gen.scenes.length
  const continuityBrief = `${scene.brief}. Scene ${nextIndex + 1} of ${sceneCount} in a continuous ad storyboard. Continue seamlessly from the previous shot.`
  const model = resolveSeedanceModel(gen.model)

  try {
    const result = await submitSeedanceJob({
      brief: continuityBrief,
      creative: gen.creative as Partial<CreativeSelections> | null,
      enhance: enhance === true,
      duration: gen.duration_seconds,
      aspect_ratio: gen.aspect_ratio,
      reference_images: reference_images,
      first_frame_image: firstFrame,
      generate_audio: generate_audio === true,
      model: model.key,
      ignoreRefFrames: true,
      resolution: resolveSubmitResolution(model, resolution),
    })

    const scenes = gen.scenes.map((s, i) =>
      i === nextIndex
        ? { ...s, jobId: result.jobId, status: 'processing' }
        : s
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
