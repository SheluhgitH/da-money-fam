'use client'

import { useRef, useState, useEffect } from 'react'
import { PREVIEW_DURATION_SEC, pauseAllExceptAudio } from '@/lib/audio-constants'
import { usePreviewPlayerOptional } from '@/contexts/PreviewPlayerContext'

interface PreviewPlayerProps {
  songId: string
  owned?: boolean
  className?: string
  title?: string
  artist?: string
  cover?: string
  price?: number
  for_sale?: boolean
  previewDurationSec?: number
}

export default function PreviewPlayer({
  songId,
  owned,
  className = '',
  title = '',
  artist = '',
  cover = '',
  price,
  for_sale,
  previewDurationSec = PREVIEW_DURATION_SEC,
}: PreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const previewCtx = usePreviewPlayerOptional()
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewEnded, setPreviewEnded] = useState(false)

  const isActiveInBar = previewCtx?.activePreview?.songId === songId

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
      if (!owned && t >= previewDurationSec) {
        audio.pause()
        audio.currentTime = previewDurationSec
        setIsPlaying(false)
        setPreviewEnded(true)
        if (isActiveInBar && previewCtx) {
          previewCtx.setIsPlaying(false)
          previewCtx.setPreviewEnded(true)
        }
      }
      const max = owned ? audio.duration || 1 : previewDurationSec
      const pct = (t / max) * 100
      setProgress(pct)
      if (isActiveInBar && previewCtx) {
        previewCtx.setProgress(pct)
      }
    }

    const onEnded = () => {
      setIsPlaying(false)
      if (isActiveInBar && previewCtx) previewCtx.setIsPlaying(false)
    }

    const onPlay = () => {
      if (isActiveInBar && previewCtx) previewCtx.setIsPlaying(true)
    }

    const onPause = () => {
      if (isActiveInBar && previewCtx) previewCtx.setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [owned, songId, previewDurationSec, isActiveInBar, previewCtx])

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
        if (previewCtx && title) {
          previewCtx.registerPreview({
            songId,
            title,
            artist,
            cover,
            owned,
            price,
            for_sale,
          })
        }
        await audio.play()
        setIsPlaying(true)
        if (previewCtx) previewCtx.setIsPlaying(true)
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
        data-song-id={songId}
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
              : `${previewDurationSec}s preview`}
        </p>
      </div>
    </div>
  )
}
