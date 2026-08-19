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
  AdVideoPricingResponse,
  StoryboardScene,
} from '@/lib/ad-studio-types'
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_IMAGES } from '@/lib/ad-studio-types'
import {
  DEFAULT_SEEDANCE_MODEL,
  resolveSeedanceModel,
  type SeedanceModelKey,
} from '@/lib/seedance-models'

const POLL_TIMEOUT_MS = 5 * 60 * 1000

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
  signal: AbortSignal
): Promise<{ status: string; videoUrl: string | null }> {
  const start = Date.now()
  let delay = 2000

  while (!signal.aborted) {
    if (Date.now() - start > POLL_TIMEOUT_MS) {
      throw new Error('Generation timed out. Please try again.')
    }

    const res = await fetch(`/api/video/${jobId}`, { signal })
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
  const [duration, setDuration] = useState<6 | 8 | 10>(6)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [variations, setVariations] = useState<1 | 2>(1)
  const [modelKey, setModelKey] = useState<SeedanceModelKey>(DEFAULT_SEEDANCE_MODEL)
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

  const abortRef = useRef<AbortController | null>(null)

  const sceneCount = mode === 'storyboard' ? sceneBriefs.length : 1

  const fetchPricing = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/video/quote?scenes=${sceneCount}&variations=${mode === 'single' ? variations : 1}&model=${modelKey}&duration=${duration}`
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
  }, [sceneCount, variations, mode, modelKey, duration])

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
        if (!file.type.startsWith('image/')) {
          setError('Only image files are supported.')
          return
        }
        if (file.size > MAX_REFERENCE_BYTES) {
          setError(`${file.name} is too large. Max 4MB per image.`)
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setReferences((prev) => {
              if (prev.length >= MAX_REFERENCE_IMAGES) return prev
              return [...prev, { url: reader.result as string, useAsFirstFrame: false }]
            })
          }
        }
        reader.readAsDataURL(file)
      })
  }

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleFirstFrame = (index: number) => {
    setReferences((prev) =>
      prev.map((img, i) => ({
        ...img,
        useAsFirstFrame: i === index ? !img.useAsFirstFrame : false,
      }))
    )
  }

  const setSceneCount = (count: 2 | 3) => {
    setSceneBriefs((prev) => {
      if (count === 2) return [prev[0] || '', prev[1] || '']
      return [prev[0] || '', prev[1] || '', prev[2] || '']
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
  }

  const selectLibraryItem = (item: AdStudioGeneration) => {
    setSelectedLibraryId(item.id)
    setPreviewUrls(item.video_urls || [])
    setActivePreviewIndex(0)
    setBrief(item.brief || '')
    setAspectRatio(item.aspect_ratio)
    setDuration((item.duration_seconds as 6 | 8 | 10) || 6)
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
      ? Boolean(brief.trim())
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

    try {
      if (mode === 'storyboard') {
        setStatusText('Starting storyboard…')
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

          let jobId: string
          if (i === 0) {
            jobId = startData.jobs[0].jobId
          } else {
            const contRes = await fetch(`/api/video/storyboard/${storyboardId}/continue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                first_frame_image: lastFrame,
                reference_images: references,
                enhance,
              }),
              signal: controller.signal,
            })
            const contData = await contRes.json()
            if (!contRes.ok) {
              throw new Error(contData.details || contData.error || 'Failed to continue storyboard')
            }
            jobId = contData.jobId
          }

          const polled = await pollJob(jobId, controller.signal)
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
            setStatusText(`Scene ${i + 1} done · Capturing frame for next…`)
            lastFrame = await extractLastFrame(polled.videoUrl)
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
              status: 'completed',
            },
          }),
        })

        setStatusText(null)
        await fetchLibrary()
        await fetchPricing()
      } else {
        setStatusText(variations > 1 ? `Generating ${variations} variants…` : 'Rendering…')
        const res = await fetch('/api/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brief,
            creative,
            enhance,
            duration_seconds: duration,
            aspect_ratio: aspectRatio,
            reference_images: references,
            variations,
            saveToLibrary: true,
            model: modelKey,
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

        for (let i = 0; i < jobs.length; i++) {
          setStatusText(
            jobs.length > 1 ? `Variant ${i + 1} of ${jobs.length} · Rendering…` : 'Rendering…'
          )
          const polled = await pollJob(jobs[i].jobId, controller.signal)
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
    } finally {
      setGenerating(false)
      abortRef.current = null
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
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    variations,
    setVariations,
    modelKey,
    setModelKey,
    references,
    addReferenceFiles,
    removeReference,
    toggleFirstFrame,
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
  }
}

export type AdStudioController = ReturnType<typeof useAdStudio>
