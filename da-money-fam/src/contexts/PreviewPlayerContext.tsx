'use client'

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { pauseAllExceptAudio } from '@/lib/audio-constants'

export type ActivePreview = {
  songId: string
  title: string
  artist: string
  cover: string
  owned?: boolean
  price?: number
  for_sale?: boolean
}

function findActiveAudio(songId: string): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`audio[data-song-id="${songId}"]`)
}

type PreviewPlayerContextValue = {
  activePreview: ActivePreview | null
  isPlaying: boolean
  progress: number
  previewEnded: boolean
  upsellOpen: boolean
  purchasing: boolean
  purchaseError: string | null
  audioRef: React.RefObject<HTMLAudioElement | null>
  registerPreview: (preview: ActivePreview) => void
  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setPreviewEnded: (ended: boolean) => void
  setUpsellOpen: (open: boolean) => void
  openUpsell: () => void
  closeUpsell: () => void
  replayPreview: () => Promise<void>
  purchasePreviewSong: () => Promise<void>
  clearPreview: () => void
}

const PreviewPlayerContext = createContext<PreviewPlayerContextValue | undefined>(undefined)

export function PreviewPlayerProvider({ children }: { children: ReactNode }) {
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewEnded, setPreviewEnded] = useState(false)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const activePreviewRef = useRef<ActivePreview | null>(null)

  const registerPreview = useCallback((preview: ActivePreview) => {
    activePreviewRef.current = preview
    setActivePreview(preview)
    setPreviewEnded(false)
    setProgress(0)
    setUpsellOpen(false)
    setPurchaseError(null)
  }, [])

  const openUpsell = useCallback(() => {
    const current = activePreviewRef.current
    if (current && !current.owned && current.for_sale) {
      setUpsellOpen(true)
    }
  }, [])

  const closeUpsell = useCallback(() => {
    setUpsellOpen(false)
  }, [])

  const replayPreview = useCallback(async () => {
    const current = activePreviewRef.current
    setPreviewEnded(false)
    setProgress(0)
    setUpsellOpen(false)
    setPurchaseError(null)

    if (!current) return
    const audio = findActiveAudio(current.songId)
    if (!audio) return

    audio.currentTime = 0
    pauseAllExceptAudio(audio)
    try {
      await audio.play()
      setIsPlaying(true)
    } catch {
      setIsPlaying(false)
    }
  }, [])

  const purchasePreviewSong = useCallback(async () => {
    const current = activePreviewRef.current
    if (!current?.songId || current.owned) return

    setPurchasing(true)
    setPurchaseError(null)
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: current.songId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Checkout failed')
      setPurchasing(false)
    }
  }, [])

  const clearPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    activePreviewRef.current = null
    setActivePreview(null)
    setIsPlaying(false)
    setProgress(0)
    setPreviewEnded(false)
    setUpsellOpen(false)
    setPurchasing(false)
    setPurchaseError(null)
  }, [])

  return (
    <PreviewPlayerContext.Provider
      value={{
        activePreview,
        isPlaying,
        progress,
        previewEnded,
        upsellOpen,
        purchasing,
        purchaseError,
        audioRef,
        registerPreview,
        setIsPlaying,
        setProgress,
        setPreviewEnded,
        setUpsellOpen,
        openUpsell,
        closeUpsell,
        replayPreview,
        purchasePreviewSong,
        clearPreview,
      }}
    >
      {children}
    </PreviewPlayerContext.Provider>
  )
}

export function usePreviewPlayer() {
  const ctx = useContext(PreviewPlayerContext)
  if (!ctx) {
    throw new Error('usePreviewPlayer must be used within PreviewPlayerProvider')
  }
  return ctx
}

export function usePreviewPlayerOptional() {
  return useContext(PreviewPlayerContext)
}
