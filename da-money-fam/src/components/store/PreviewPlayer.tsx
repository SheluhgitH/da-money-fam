'use client'

import { useRef, useState, useEffect } from 'react'
import { PREVIEW_DURATION_SEC, pauseAllExceptAudio } from '@/lib/audio-constants'

interface PreviewPlayerProps {
  songId: string
  owned?: boolean
  className?: string
}

export default function PreviewPlayer({ songId, owned, className = '' }: PreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewEnded, setPreviewEnded] = useState(false)

  const streamUrl = owned
    ? `/api/library/stream/${songId}`
    : `/api/preview/${songId}`

  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
    setPreviewEnded(false)
  }, [songId, owned])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      const t = audio.currentTime
      if (!owned && t >= PREVIEW_DURATION_SEC) {
        audio.pause()
        audio.currentTime = PREVIEW_DURATION_SEC
        setIsPlaying(false)
        setPreviewEnded(true)
      }
      const max = owned ? audio.duration || 1 : PREVIEW_DURATION_SEC
      setProgress((t / max) * 100)
    }

    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [owned, songId])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (previewEnded && !owned) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      try {
        pauseAllExceptAudio(audio)
        await audio.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
    }
  }

  return (
    <div
      className={`flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <audio
        ref={audioRef}
        src={streamUrl}
        preload="none"
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
      />

      <button
        type="button"
        onClick={togglePlay}
        disabled={previewEnded && !owned}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gold text-black hover:bg-white transition-colors disabled:opacity-40 shrink-0"
        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-150"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-[9px] text-white/50 mt-1 truncate">
          {owned
            ? 'Full track unlocked'
            : previewEnded
              ? 'Purchase to unlock full track'
              : `${PREVIEW_DURATION_SEC}s preview`}
        </p>
      </div>
    </div>
  )
}
