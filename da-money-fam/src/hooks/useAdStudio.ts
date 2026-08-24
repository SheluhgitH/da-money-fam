'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CREATIVE_SELECTIONS,
  type CreativeRow,
  type CreativeSelections,
} from '@/lib/ad-creative-presets'
import type {
  AdReferenceImage,
  AdStudioGeneration,
  AdStudioMode,
  AdStudioPreset,
  AdVideoPricingResponse,
  QueuedGenerationJob,
  StoryboardScene,
} from '@/lib/ad-studio-types'
import {
  MAX_REFERENCE_IMAGES,
  MAX_STORYBOARD_SCENES,
  MIN_STORYBOARD_SCENES,
} from '@/lib/ad-studio-types'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  SEEDANCE_MODELS,
  type SeedanceModelKey,
  type SeedanceResolution,
} from '@/lib/seedance-models'
import { resolvePlayableVideoUrls } from '@/lib/ad-studio-video-urls'
import { compressImageForUpload } from '@/lib/compress-image'
import { FROM_STILL_VIDEO } from '@/lib/studio-templates'

const DRAFT_KEY = 'dmf-ad-studio-draft-v1'
const POLL_TIMEOUT_MS = 8 * 60 * 1000

async function uploadDataUrlAsRef(dataUrl: string): Promise<string | null> {
  try {
    const res = await fetch('/api/ad-studio/upload-ref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, contentType: 'image/jpeg' }),
    })
    const data = await res.json()
    if (!res.ok || typeof data.url !== 'string') return null
    return data.url
  } catch {
    return null
  }
}

async function captureLastFrameHttps(
  videoUrl: string,
  storyboardId: string
): Promise<string | null> {
  const dataUrl = await extractLastFrame(videoUrl)
  if (dataUrl?.startsWith('data:')) {
    const uploaded = await uploadDataUrlAsRef(dataUrl)
    if (uploaded) return uploaded
  }
  try {
    const res = await fetch(`/api/video/storyboard/${storyboardId}/last-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    })
    const data = await res.json()
    if (res.ok && typeof data.url === 'string') return data.url
  } catch {
    /* fall through */
  }
  return null
}

async function extractLastFrame(videoUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    video.onloadedmetadata = () => {
      const seekTo = Math.max(0, (video.duration || 0) - 0.15)
      video.currentTime = seekTo
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 720
        canvas.height = video.videoHeight || 1280
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        cleanup()
        resolve(dataUrl)
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.src = videoUrl
  })
}

async function pollJob(
  jobId: string,
  signal: AbortSignal,
  generationId?: string | null
): Promise<{ status: string; videoUrl: string | null }> {
  const start = Date.now()
  let delay = 2000

  while (!signal.aborted) {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error('Generation timed out. Please try again.')
    }

    const qs = generationId ? `?generationId=${encodeURIComponent(generationId)}` : ''
    const res = await fetch(`/api/video/${jobId}${qs}`, { signal })
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, delay))
      delay = Math.min(8000, delay + 1000)
      continue
    }

    const data = await res.json()
    if (data.status === 'completed' || data.status === 'succeeded') {
      return { status: data.status, videoUrl: data.videoUrl }
    }
    if (data.status === 'failed') {
      throw new Error('Video generation failed.')
    }

    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(8000, delay + 1000)
  }

  throw new Error('Cancelled')
}

export function useAdStudio(initialBrief = '') {
  const [mode, setMode] = useState<AdStudioMode>('single')
  const [brief, setBrief] = useState(initialBrief)
  const [sceneBriefs, setSceneBriefs] = useState(['', ''])
  const [creative, setCreative] = useState<CreativeSelections>(DEFAULT_CREATIVE_SELECTIONS)
  const [enhance, setEnhance] = useState(false)
  const [duration, setDuration] = useState(6)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [variations, setVariations] = useState<1 | 2>(1)
  const [modelKey, setModelKeyState] = useState<SeedanceModelKey>(DEFAULT_SEEDANCE_MODEL)
  const [generateAudio, setGenerateAudio] = useState(false)
  const [resolution, setResolutionState] = useState<SeedanceResolution>('480p')
  const [lookCharacterId, setLookCharacterId] = useState<string | null>(null)
  const [references, setReferences] = useState<AdReferenceImage[]>([])
  const [lookOpen, setLookOpen] = useState(false)

  const [pricing, setPricing] = useState<AdVideoPricingResponse | null>(null)
  const [library, setLibrary] = useState<AdStudioGeneration[]>([])
  const [generating, setGenerating] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
  const [presets, setPresets] = useState<AdStudioPreset[]>([])
  const [queue, setQueue] = useState<QueuedGenerationJob[]>([])
  const [progressStep, setProgressStep] = useState(0)
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null)
  const [basePreview, setBasePreview] = useState<string | null>(null)
  const [enhancePreviewLoading, setEnhancePreviewLoading] = useState(false)
  const [enhancePreviewOpen, setEnhancePreviewOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const queueBusyRef = useRef(false)

  const sceneCount = mode === 'storyboard' ? sceneBriefs.length : 1

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/video/quote?scenes=${sceneCount}&variations=${mode === 'single' ? variations : 1}&model=${modelKey}&duration=${duration}&audio=${generateAudio ? '1' : '0'}&resolution=${resolution}`
      )
      if (res.ok) {
        const data: AdVideoPricingResponse = await res.json()
        setPricing(data)
      } else {
        setPricing(null)
      }
    } catch {
      setPricing(null)
    }
  }, [sceneCount, variations, mode, modelKey, duration, generateAudio, resolution])

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/video/library')
      if (res.ok) {
        const data = await res.json()
        setLibrary(data.items || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchPricing()
  }, [fetchPricing])

  useEffect(() => {
    fetchLibrary()
  }, [fetchLibrary])

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/video/presets')
      if (res.ok) {
        const data = await res.json()
        setPresets(data.presets || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        brief?: string
        mode?: AdStudioMode
        sceneBriefs?: string[]
        creative?: CreativeSelections
        duration?: number
        aspectRatio?: string
        modelKey?: SeedanceModelKey
        generateAudio?: boolean
        resolution?: SeedanceResolution
      }
      if (draft.brief && !initialBrief) setBrief(draft.brief)
      if (draft.mode) setMode(draft.mode)
      if (draft.sceneBriefs?.length) setSceneBriefs(draft.sceneBriefs)
      if (draft.creative) setCreative({ ...DEFAULT_CREATIVE_SELECTIONS, ...draft.creative })
      if (draft.duration) setDuration(draft.duration)
      if (draft.aspectRatio) setAspectRatio(draft.aspectRatio)
      if (draft.modelKey) setModelKeyState(draft.modelKey)
      if (typeof draft.generateAudio === 'boolean') setGenerateAudio(draft.generateAudio)
      if (draft.resolution === '720p' || draft.resolution === '480p') {
        setResolutionState(draft.resolution)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            brief,
            mode,
            sceneBriefs,
            creative,
            duration,
            aspectRatio,
            modelKey,
            generateAudio,
            resolution,
          })
        )
      } catch {
        /* ignore */
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [brief, mode, sceneBriefs, creative, duration, aspectRatio, modelKey, generateAudio, resolution])

  useEffect(() => {
    if (pricing && !pricing.canEnhance && enhance) setEnhance(false)
  }, [pricing, enhance])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const setCreativeOption = (row: CreativeRow, optionId: string) => {
    setCreative((prev) => ({ ...prev, [row]: optionId }))
  }

  const applyTemplate = (briefText: string, creativePatch?: Partial<CreativeSelections>) => {
    setBrief(briefText)
    if (creativePatch) {
      setCreative((prev) => ({ ...prev, ...creativePatch }))
    }
    setEnhancedPreview(null)
    setBasePreview(null)
  }

  const previewEnhance = async () => {
    if (!pricing?.canEnhance) {
      setError('Enhance preview requires Fan Club.')
      return
    }
    const scenePayload =
      mode === 'storyboard'
        ? { scenes: sceneBriefs.map((b) => ({ brief: b })), creative }
        : { brief, creative }
    setEnhancePreviewLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/video/enhance-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scenePayload,
          reference_urls: references
            .map((r) => r.url)
            .filter((u) => u.startsWith('http://') || u.startsWith('https://')),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enhance preview failed')
      if (data.mode === 'storyboard') {
        setBasePreview((data.basePrompts || []).join('\n\n—\n\n'))
        setEnhancedPreview((data.enhancedPrompts || []).join('\n\n—\n\n'))
      } else {
        setBasePreview(data.basePrompt || null)
        setEnhancedPreview(data.enhancedPrompt || null)
      }
      setEnhancePreviewOpen(true)
      setEnhance(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhance preview failed')
    } finally {
      setEnhancePreviewLoading(false)
    }
  }

  const addReferenceFromUrl = (url: string, useAsFirstFrame = false) => {
    setReferences((prev) => {
      if (prev.length >= MAX_REFERENCE_IMAGES) return prev
      if (prev.some((r) => r.url === url)) return prev
      return [...prev, { url, useAsFirstFrame, useAsLastFrame: false }]
    })
  }

  const addReferenceFiles = (files: FileList | null) => {
    if (!files?.length) return
    const remaining = MAX_REFERENCE_IMAGES - references.length
    if (remaining <= 0) {
      setError(`You can add up to ${MAX_REFERENCE_IMAGES} reference images.`)
      return
    }

    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
          setError('Only image files are supported.')
          return
        }
        const localPreview = URL.createObjectURL(file)
        setReferences((prev) => {
          if (prev.length >= MAX_REFERENCE_IMAGES) return prev
          return [...prev, { url: localPreview, useAsFirstFrame: false, useAsLastFrame: false }]
        })

        ;(async () => {
          try {
            const compressed = await compressImageForUpload(file)
            const res = await fetch('/api/ad-studio/upload-ref', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl: compressed.dataUrl,
                contentType: compressed.contentType,
              }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')
            setReferences((prev) =>
              prev.map((r) => (r.url === localPreview ? { ...r, url: data.url as string } : r))
            )
            URL.revokeObjectURL(localPreview)
          } catch (err) {
            setReferences((prev) => prev.filter((r) => r.url !== localPreview))
            URL.revokeObjectURL(localPreview)
            setError(err instanceof Error ? err.message : 'Reference upload failed')
          }
        })()
      })
  }

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleFirstFrame = (index: number) => {
    setReferences((prev) =>
      prev.map((img, i) =>
        i === index
          ? { ...img, useAsFirstFrame: !img.useAsFirstFrame, useAsLastFrame: false }
          : { ...img, useAsFirstFrame: false }
      )
    )
  }

  const toggleLastFrame = (index: number) => {
    setReferences((prev) =>
      prev.map((img, i) =>
        i === index
          ? { ...img, useAsLastFrame: !img.useAsLastFrame, useAsFirstFrame: false }
          : { ...img, useAsLastFrame: false }
      )
    )
  }

  const setModelKey = (key: SeedanceModelKey) => {
    setModelKeyState(key)
    const model = SEEDANCE_MODELS[key]
    if (!model.durations.includes(duration)) {
      setDuration(model.durations.includes(6) ? 6 : model.durations[0])
    }
    if (!model.supportsAudio) setGenerateAudio(false)
    if (!model.resolutions.includes('720p')) setResolutionState('480p')
  }

  const setResolution = (next: SeedanceResolution) => {
    const model = SEEDANCE_MODELS[modelKey]
    if (next === '720p' && !model.resolutions.includes('720p')) return
    setResolutionState(next)
  }

  const setSceneCount = (count: number) => {
    const n = Math.min(MAX_STORYBOARD_SCENES, Math.max(MIN_STORYBOARD_SCENES, count))
    setSceneBriefs((prev) => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  const updateSceneBrief = (index: number, value: string) => {
    setSceneBriefs((prev) => prev.map((b, i) => (i === index ? value : b)))
  }

  const cancelGenerate = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setGenerating(false)
    setStatusText(null)
    setProgressStep(0)
    setQueue((prev) =>
      prev.map((j) =>
        j.status === 'running' || j.status === 'queued'
          ? { ...j, status: 'cancelled' as const }
          : j
      )
    )
  }

  const resetJob = () => {
    if (generating) {
      const ok = window.confirm('A clip is still generating. Start a new job anyway?')
      if (!ok) return
      cancelGenerate()
    }
    setBrief('')
    setSceneBriefs(['', ''])
    setMode('single')
    setReferences([])
    setPreviewUrls([])
    setActivePreviewIndex(0)
    setSelectedLibraryId(null)
    setError(null)
    setEnhancedPreview(null)
    setBasePreview(null)
    setStatusText(null)
  }

  const applyJobChip = (
    chip: 'hook' | 'hero' | 'end' | 'storyboard'
  ) => {
    if (chip === 'hook') {
      setMode('single')
      setDuration(SEEDANCE_MODELS[modelKey].durations.includes(6) ? 6 : SEEDANCE_MODELS[modelKey].durations[0])
      setBrief('15-second hook: cold open on the talent, punchy product reveal in the first 3 seconds, luxury hip-hop energy, cut before a logo card.')
    } else if (chip === 'hero') {
      setMode('single')
      setBrief('Product hero: slow push-in on the product in hand, same wardrobe and lighting, premium commercial polish, no text.')
    } else if (chip === 'end') {
      setMode('single')
      setBrief('End card: hold on talent and product, slow camera settle, space for a logo, gold and black luxury close.')
    } else {
      setMode('storyboard')
      setSceneCount(3)
      setSceneBriefs([
        'Hook: cold open, eye contact, product enters frame.',
        'Product hero: same look, show the item clearly in hand.',
        'End card: hold, premium closer, no readable text.',
      ])
    }
  }

  const startStoryboardFromStill = (url: string, hint?: string) => {
    addReferenceFromUrl(url, true)
    setMode('storyboard')
    setSceneCount(3)
    const subject = (hint || brief).trim() || 'this look'
    setSceneBriefs([
      `Hook: open on this still as the first frame. ${subject}. Camera eases in.`,
      `Product: same talent and wardrobe, show the product clearly.`,
      `End card: same look, hold for a closer, no readable text.`,
    ])
  }

  const savePreset = async (name?: string) => {
    const res = await fetch('/api/video/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || `Look ${new Date().toLocaleDateString()}`,
        brief,
        creative,
        aspect_ratio: aspectRatio,
        model: modelKey,
        duration_seconds: duration,
        look_ref_urls: references.map((r) => r.url),
        look_character_id: lookCharacterId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save look')
    await fetchPresets()
    return data.preset as AdStudioPreset
  }

  const applyPreset = (preset: AdStudioPreset) => {
    if (preset.brief) setBrief(preset.brief)
    if (preset.creative) {
      const rest = { ...preset.creative }
      delete rest.lookRefUrls
      delete rest.lookCharacterId
      setCreative({ ...DEFAULT_CREATIVE_SELECTIONS, ...rest })
    }
    if (preset.aspect_ratio) setAspectRatio(preset.aspect_ratio)
    if (preset.model) setModelKey(resolveSeedanceModel(preset.model).key)
    if (preset.duration_seconds) {
      setDuration(preset.duration_seconds || 6)
    }
    const urls = preset.look_ref_urls?.length
      ? preset.look_ref_urls
      : preset.creative?.lookRefUrls
        ? preset.creative.lookRefUrls.split('|').filter(Boolean)
        : []
    if (urls.length) {
      setReferences(urls.slice(0, MAX_REFERENCE_IMAGES).map((url) => ({
        url,
        useAsFirstFrame: false,
        useAsLastFrame: false,
      })))
    }
    setLookCharacterId(preset.look_character_id || preset.creative?.lookCharacterId || null)
  }

  const deletePreset = async (id: string) => {
    await fetch(`/api/video/presets?id=${id}`, { method: 'DELETE' })
    await fetchPresets()
  }

  const selectLibraryItem = (item: AdStudioGeneration) => {
    setSelectedLibraryId(item.id)
    setPreviewUrls(resolvePlayableVideoUrls(item))
    setActivePreviewIndex(0)
    setBrief(item.brief || '')
    setAspectRatio(item.aspect_ratio)
    setDuration(item.duration_seconds || 6)
    setModelKey(resolveSeedanceModel(item.model).key)
    if (item.creative) setCreative({ ...DEFAULT_CREATIVE_SELECTIONS, ...item.creative })
    if (item.mode === 'storyboard' && item.scenes?.length) {
      setMode('storyboard')
      setSceneBriefs(item.scenes.map((s) => s.brief))
    } else {
      setMode('single')
    }
  }

  const setFeatured = async (item: AdStudioGeneration, featured: boolean) => {
    if (item.admin_hidden && featured) {
      setError('This ad was hidden by an admin and cannot be featured.')
      return
    }
    try {
      const res = await fetch('/api/video/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, patch: { featured } }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update visibility')
      }
      setLibrary((prev) => prev.map((row) => (row.id === item.id ? { ...row, featured } : row)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility')
    }
  }

  const remixFromLibrary = (item: AdStudioGeneration) => {
    selectLibraryItem(item)
    const base = item.brief || item.scenes?.[0]?.brief || ''
    setBrief(base.startsWith('Remix:') ? base : `Remix: ${base}`)
    setPreviewUrls([])
    setSelectedLibraryId(null)
  }

  const canGenerate =
    mode === 'single'
      ? Boolean(brief.trim()) || references.some((r) => r.url.startsWith('http'))
      : sceneBriefs.every((b) => b.trim()) && sceneBriefs.length >= 2

  const generate = async () => {
    if (!canGenerate || generating) return
    if (!pricing?.isAuthenticated) {
      setError('Please sign in to generate ads.')
      return
    }
    if (!pricing.canAfford) {
      setError('Insufficient Coinz. Buy more below or use Buy Coinz.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setGenerating(true)
    setError(null)
    setPreviewUrls([])
    setActivePreviewIndex(0)
    setProgressStep(1)
    const jobId = crypto.randomUUID()
    setQueue((prev) => [
      {
        id: jobId,
        status: 'running',
        label: (mode === 'single' ? brief : `Storyboard (${sceneBriefs.length})`).slice(0, 48),
        startedAt: Date.now(),
      },
      ...prev.slice(0, 9),
    ])

    try {
      if (mode === 'storyboard') {
        setStatusText('Starting storyboard…')
        setProgressStep(1)
        const startRes = await fetch('/api/video/storyboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: sceneBriefs.map((b) => ({ brief: b })),
            creative,
            enhance,
            duration_seconds: duration,
            aspect_ratio: aspectRatio,
            reference_images: references,
            model: modelKey,
            generate_audio: generateAudio,
            resolution,
          }),
          signal: controller.signal,
        })

        const startData = await startRes.json()
        if (!startRes.ok) {
          throw new Error(startData.details || startData.error || 'Failed to start storyboard')
        }

        const storyboardId = startData.storyboardId as string
        const completedUrls: string[] = []
        let lastFrame: string | null = null
        const scenesState: StoryboardScene[] = sceneBriefs.map((b) => ({
          brief: b,
          status: 'pending',
        }))

        for (let i = 0; i < sceneBriefs.length; i++) {
          setStatusText(`Scene ${i + 1} of ${sceneBriefs.length} · Rendering…`)
          setProgressStep(Math.min(4, 1 + Math.floor((i / sceneBriefs.length) * 3)))

          let jobId: string
          if (i === 0) {
            jobId = startData.jobs[0].jobId
          } else {
            const contRes = await fetch(`/api/video/storyboard/${storyboardId}/continue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                first_frame_image: lastFrame,
                reference_images: references.map((r) => ({
                  url: r.url,
                  useAsFirstFrame: false,
                  useAsLastFrame: false,
                })),
                enhance,
                generate_audio: generateAudio,
                resolution,
              }),
              signal: controller.signal,
            })
            const contData = await contRes.json()
            if (!contRes.ok) {
              throw new Error(contData.details || contData.error || 'Failed to continue storyboard')
            }
            jobId = contData.jobId
          }

          const polled = await pollJob(jobId, controller.signal, storyboardId)
          if (!polled.videoUrl) throw new Error('No video URL returned')

          completedUrls.push(polled.videoUrl)
          scenesState[i] = {
            brief: sceneBriefs[i],
            jobId,
            videoUrl: polled.videoUrl,
            status: 'completed',
          }
          setPreviewUrls([...completedUrls])
          setActivePreviewIndex(i)

          if (i < sceneBriefs.length - 1) {
            setStatusText(`Scene ${i + 1} done · Capturing last frame…`)
            lastFrame = await captureLastFrameHttps(polled.videoUrl, storyboardId)
            if (!lastFrame) {
              throw new Error('Could not capture last frame to continue the storyboard.')
            }
          }
        }

        await fetch('/api/video/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: storyboardId,
            patch: {
              scenes: scenesState,
              video_urls: completedUrls,
              thumbnail_url: completedUrls[0] || null,
              status: 'processing',
            },
          }),
        })

        setStatusText('Stitching cut…')
        let previewList = [...completedUrls]
        try {
          const stitchRes = await fetch(`/api/video/storyboard/${storyboardId}/stitch`, {
            method: 'POST',
            signal: controller.signal,
          })
          const stitchData = await stitchRes.json()
          if (stitchRes.ok && Array.isArray(stitchData.video_urls) && stitchData.video_urls.length) {
            previewList = stitchData.video_urls
          } else if (typeof stitchData.url === 'string') {
            previewList = [stitchData.url, ...completedUrls]
          } else {
            setError(stitchData.error || 'Stitch failed — playing scenes separately')
          }
        } catch {
          setError('Stitch failed — playing scenes separately')
        }

        setPreviewUrls(previewList)
        setActivePreviewIndex(0)

        await fetch('/api/video/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: storyboardId,
            patch: {
              scenes: scenesState,
              video_urls: previewList,
              thumbnail_url: previewList[0] || null,
              status: 'completed',
            },
          }),
        })

        setStatusText(null)
        await fetchLibrary()
        await fetchPricing()
      } else {
        setStatusText(variations > 1 ? `Generating ${variations} variants…` : 'Rendering…')
        setProgressStep(enhance ? 2 : 1)
        const res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief: brief.trim() || FROM_STILL_VIDEO,
            creative,
            enhance,
            duration_seconds: duration,
            aspect_ratio: aspectRatio,
            reference_images: references,
            variations,
            saveToLibrary: true,
            model: modelKey,
            generate_audio: generateAudio,
            enhancedPrompt: enhance && enhancedPreview ? enhancedPreview : null,
            resolution,
          }),
          signal: controller.signal,
        })

        const data = await res.json()
        if (res.status === 401) throw new Error('Please sign in to generate ads.')
        if (res.status === 402) throw new Error('Insufficient Coinz.')
        if (res.status === 403) throw new Error(data.error || 'Enhance requires Fan Club.')
        if (!res.ok) throw new Error(data.details || data.error || 'Generation failed')

        const jobs: Array<{ jobId: string }> = data.jobs || [{ jobId: data.jobId }]
        const urls: string[] = []
        const generationId = data.generationId as string | undefined

        for (let i = 0; i < jobs.length; i++) {
          setStatusText(
            jobs.length > 1 ? `Variant ${i + 1} of ${jobs.length} · Rendering…` : 'Rendering…'
          )
          const polled = await pollJob(jobs[i].jobId, controller.signal, generationId)
          if (polled.videoUrl) urls.push(polled.videoUrl)
        }

        if (!urls.length) throw new Error('No video returned')

        setPreviewUrls(urls)
        setActivePreviewIndex(0)

        if (data.generationId) {
          await fetch('/api/video/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.generationId,
              patch: {
                video_urls: urls,
                thumbnail_url: urls[0],
                status: 'completed',
                scenes: jobs.map((j, i) => ({
                  brief,
                  jobId: j.jobId,
                  videoUrl: urls[i] || null,
                  status: 'completed',
                })),
              },
            }),
          })
        }

        setStatusText(null)
        setProgressStep(0)
        setQueue((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: 'completed' as const } : j))
        )
        await fetchLibrary()
        await fetchPricing()
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Generation cancelled.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate')
      }
      setStatusText(null)
      setProgressStep(0)
      setQueue((prev) =>
        prev.map((j) =>
          j.status === 'running' ? { ...j, status: 'failed' as const, error: String(err) } : j
        )
      )
    } finally {
      setGenerating(false)
      abortRef.current = null
      queueBusyRef.current = false
    }
  }

  return {
    mode,
    setMode,
    brief,
    setBrief,
    sceneBriefs,
    setSceneCount,
    updateSceneBrief,
    creative,
    setCreativeOption,
    enhance,
    setEnhance,
    enhancedPreview,
    basePreview,
    enhancePreviewLoading,
    enhancePreviewOpen,
    setEnhancePreviewOpen,
    previewEnhance,
    applyTemplate,
    addReferenceFromUrl,
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    variations,
    setVariations,
    modelKey,
    setModelKey,
    generateAudio,
    setGenerateAudio,
    resolution,
    setResolution,
    lookCharacterId,
    setLookCharacterId,
    references,
    addReferenceFiles,
    removeReference,
    toggleFirstFrame,
    toggleLastFrame,
    lookOpen,
    setLookOpen,
    pricing,
    library,
    generating,
    statusText,
    error,
    setError,
    previewUrls,
    activePreviewIndex,
    setActivePreviewIndex,
    selectedLibraryId,
    selectLibraryItem,
    remixFromLibrary,
    setFeatured,
    canGenerate,
    generate,
    cancelGenerate,
    fetchPricing,
    fetchLibrary,
    presets,
    savePreset,
    applyPreset,
    deletePreset,
    resetJob,
    applyJobChip,
    startStoryboardFromStill,
    queue,
    progressStep,
  }
}

export type AdStudioController = ReturnType<typeof useAdStudio>
