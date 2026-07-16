'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ActivePreview = {
  songId: string
  title: string
  artist: string
  cover: string
  owned?: boolean
  price?: number
  for_sale?: boolean
}

type PreviewPlayerContextValue = {
  activePreview: ActivePreview | null
  isPlaying: boolean
  progress: number
  previewEnded: boolean
  audioRef: React.RefObject<HTMLAudioElement | null>
  registerPreview: (preview: ActivePreview) => void
  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
  setPreviewEnded: (ended: boolean) => void
  clearPreview: () => void
}

const PreviewPlayerContext = createContext<PreviewPlayerContextValue | undefined>(undefined)

export function PreviewPlayerProvider({ children }: { children: ReactNode }) {
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewEnded, setPreviewEnded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const registerPreview = useCallback((preview: ActivePreview) => {
    setActivePreview(preview)
    setPreviewEnded(false)
    setProgress(0)
  }, [])

  const clearPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setActivePreview(null)
    setIsPlaying(false)
    setProgress(0)
    setPreviewEnded(false)
  }, [])

  return (
    <PreviewPlayerContext.Provider
      value={{
        activePreview,
        isPlaying,
        progress,
        previewEnded,
        audioRef,
        registerPreview,
        setIsPlaying,
        setProgress,
        setPreviewEnded,
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
