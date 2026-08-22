'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageTier } from '@/lib/image-models'
import { DEFAULT_IMAGE_TIER, IMAGE_MODELS } from '@/lib/image-models'
import { MAX_REFERENCE_IMAGES } from '@/lib/ad-studio-types'
import { getGtaStyle } from '@/lib/gta-image-styles'
import { compressImageForUpload } from '@/lib/compress-image'

export type GtaQuality = 'fast' | 'smart'

export interface AdStudioImageRow {
  id: string
  prompt: string | null
  model: string
  mode: string
  aspect_ratio: string
  input_ref_urls: string[]
  output_url: string
  coinz_spent: number
  usd_cost: number | null
  created_at: string
}

export interface ImageQuote {
  quoteId: string
  expiresAt: number
  priceCoins: number
  balance: number
  canAfford: boolean
  discountPercent: number
  tierOrFanClub: string | null
  tier: ImageTier
  modelId: string
  tierPrices?: Record<string, { priceCoins: number; baseCoinsBeforeDiscount: number }>
}

async function fetchQuoteForTier(tier: ImageTier): Promise<ImageQuote | null> {
  try {
    const res = await fetch(`/api/images/quote?tier=${tier}`)
    if (!res.ok) return null
    return (await res.json()) as ImageQuote
  } catch {
    return null
  }
}

async function uploadCompressed(file: File): Promise<string> {
  const compressed = await compressImageForUpload(file)
  const res = await fetch('/api/ad-studio/upload-ref', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: compressed.dataUrl, contentType: compressed.contentType }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.url as string
}

export function useImageStudio() {
  const [prompt, setPrompt] = useState('')
  const [tier, setTier] = useState<ImageTier>(DEFAULT_IMAGE_TIER)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [mode, setMode] = useState<'generate' | 'edit'>('generate')
  const [references, setReferences] = useState<string[]>([])
  const [quote, setQuote] = useState<ImageQuote | null>(null)
  const [library, setLibrary] = useState<AdStudioImageRow[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const gtaFileRef = useRef<HTMLInputElement>(null)

  const [gtaQuality, setGtaQuality] = useState<GtaQuality>('fast')
  const [gtaQuotes, setGtaQuotes] = useState<{ fast: ImageQuote | null; smart: ImageQuote | null }>({
    fast: null,
    smart: null,
  })
  const [activeGtaStyleId, setActiveGtaStyleId] = useState<string | null>(null)
  const [gtaPhotoUrl, setGtaPhotoUrl] = useState<string | null>(null)

  const fetchQuote = useCallback(async () => {
    const data = await fetchQuoteForTier(tier)
    setQuote(data)
  }, [tier])

  const fetchGtaQuotes = useCallback(async () => {
    const [fast, smart] = await Promise.all([
      fetchQuoteForTier('fast'),
      fetchQuoteForTier('smart'),
    ])
    setGtaQuotes({ fast, smart })
    if (gtaQuality === 'fast' && fast) setQuote(fast)
    if (gtaQuality === 'smart' && smart) setQuote(smart)
  }, [gtaQuality])

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/images/generate?limit=24')
      if (res.ok) {
        const data = await res.json()
        setLibrary(data.items || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  useEffect(() => {
    fetchLibrary()
  }, [fetchLibrary])

  useEffect(() => {
    const q = gtaQuotes[gtaQuality]
    if (q) setQuote(q)
  }, [gtaQuality, gtaQuotes])

  const addReferenceFiles = (files: FileList | null) => {
    if (!files?.length) return
    const remaining = MAX_REFERENCE_IMAGES - references.length
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) return
        ;(async () => {
          try {
            setOptimizing(true)
            setError(null)
            const url = await uploadCompressed(file)
            setReferences((prev) => [...prev, url].slice(0, MAX_REFERENCE_IMAGES))
            if (mode === 'generate') setMode('edit')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
          } finally {
            setOptimizing(false)
          }
        })()
      })
  }

  const setGtaPhotoFromFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    ;(async () => {
      try {
        setOptimizing(true)
        setError(null)
        const url = await uploadCompressed(file)
        setGtaPhotoUrl(url)
        setReferences([url])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setOptimizing(false)
      }
    })()
  }

  const clearGtaPhoto = () => {
    setGtaPhotoUrl(null)
    setReferences([])
  }

  const removeReference = (index: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== index))
  }

  const useImageAsEdit = (url: string) => {
    setReferences([url])
    setMode('edit')
    setTier('edit')
    setPreviewUrl(url)
  }

  const generate = async () => {
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError(null)
    try {
      let q = quote
      if (!q || Date.now() > q.expiresAt - 10_000) {
        const res = await fetch(`/api/images/quote?tier=${tier}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Quote failed')
        q = data
        setQuote(data)
      }

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: q!.quoteId,
          prompt,
          tier,
          mode,
          aspect_ratio: aspectRatio,
          reference_urls: references,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        await fetchQuote()
        throw new Error('Quote expired — try again')
      }
      if (res.status === 402) throw new Error('Insufficient Coinz')
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setPreviewUrl(data.url)
      await fetchLibrary()
      await fetchQuote()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const generateGtaStyle = async (styleId: string) => {
    const style = getGtaStyle(styleId)
    if (!style) {
      setError('Unknown style')
      return
    }
    const photo = gtaPhotoUrl || references[0]
    if (!photo) {
      setError('Add a photo first')
      return
    }
    if (generating) return

    const qualityTier: ImageTier = gtaQuality
    const reqMode: 'generate' | 'edit' = gtaQuality === 'smart' ? 'edit' : 'generate'

    setGenerating(true)
    setActiveGtaStyleId(styleId)
    setError(null)
    try {
      let q = gtaQuotes[gtaQuality]
      if (!q || Date.now() > q.expiresAt - 10_000) {
        q = await fetchQuoteForTier(qualityTier)
        if (!q) throw new Error('Quote failed')
        setGtaQuotes((prev) => ({ ...prev, [gtaQuality]: q }))
        setQuote(q)
      }

      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: q.quoteId,
          prompt: style.prompt,
          tier: qualityTier,
          mode: reqMode,
          aspect_ratio: aspectRatio,
          reference_urls: [photo],
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        await fetchGtaQuotes()
        throw new Error('Quote expired — try again')
      }
      if (res.status === 402) throw new Error('Insufficient Coinz')
      if (!res.ok) throw new Error(data.error || 'Generation failed')

      setPreviewUrl(data.url)
      await fetchLibrary()
      await fetchGtaQuotes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
      setActiveGtaStyleId(null)
    }
  }

  const gtaPriceCoins =
    gtaQuotes[gtaQuality]?.priceCoins ?? IMAGE_MODELS[gtaQuality].baseCoins

  return {
    prompt,
    setPrompt,
    tier,
    setTier,
    aspectRatio,
    setAspectRatio,
    mode,
    setMode,
    references,
    addReferenceFiles,
    removeReference,
    useImageAsEdit,
    quote,
    library,
    previewUrl,
    setPreviewUrl,
    generating,
    optimizing,
    error,
    setError,
    generate,
    fetchQuote,
    fetchLibrary,
    fileRef,
    gtaFileRef,
    gtaQuality,
    setGtaQuality,
    gtaQuotes,
    fetchGtaQuotes,
    gtaPhotoUrl,
    setGtaPhotoFromFiles,
    clearGtaPhoto,
    generateGtaStyle,
    activeGtaStyleId,
    gtaPriceCoins,
  }
}

export type ImageStudioController = ReturnType<typeof useImageStudio>
