'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageTier } from '@/lib/image-models'
import { DEFAULT_IMAGE_TIER } from '@/lib/image-models'
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_IMAGES } from '@/lib/ad-studio-types'

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
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/images/quote?tier=${tier}`)
      if (!res.ok) {
        setQuote(null)
        return
      }
      const data = await res.json()
      setQuote(data)
    } catch {
      setQuote(null)
    }
  }, [tier])

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

  const addReferenceFiles = (files: FileList | null) => {
    if (!files?.length) return
    const remaining = MAX_REFERENCE_IMAGES - references.length
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (!file.type.startsWith('image/') || file.size > MAX_REFERENCE_BYTES) return
        const reader = new FileReader()
        reader.onload = async () => {
          if (typeof reader.result !== 'string') return
          try {
            const res = await fetch('/api/ad-studio/upload-ref', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataUrl: reader.result }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')
            setReferences((prev) => [...prev, data.url as string].slice(0, MAX_REFERENCE_IMAGES))
            if (mode === 'generate') setMode('edit')
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed')
          }
        }
        reader.readAsDataURL(file)
      })
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
    error,
    setError,
    generate,
    fetchQuote,
    fetchLibrary,
    fileRef,
  }
}

export type ImageStudioController = ReturnType<typeof useImageStudio>
