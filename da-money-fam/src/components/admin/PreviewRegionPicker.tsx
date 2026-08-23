'use client'

import { useEffect, useRef, useState } from 'react'
import { pauseAllExceptAudio, PREVIEW_DURATION_SEC } from '@/lib/audio-constants'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type PreviewRegionPickerProps = {
  audioSrc: string | null
  startSec: number
  durationSec: number | null
  previewLengthSec?: number
  onChange: (startSec: number, trackDurationSec: number) => void
  fullFileHref?: string | null
}

export default function PreviewRegionPicker({
  audioSrc,
  startSec,
  durationSec,
  previewLengthSec = PREVIEW_DURATION_SEC,
  onChange,
  fullFileHref,
}: PreviewRegionPickerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onChangeRef = useRef(onChange)
  const startRef = useRef(startSec)
  const [localDuration, setLocalDuration] = useState(durationSec ?? 0)
  const [playing, setPlaying] = useState(false)
  const [loadError, setLoadError] = useState('')

  onChangeRef.current = onChange
  startRef.current = startSec

  const duration = localDuration > 0 ? localDuration : durationSec ?? 0
  const maxStart = Math.max(0, duration - previewLengthSec)
  const clampedStart = Math.min(Math.max(0, startSec), maxStart)
  const endSec = clampedStart + Math.min(previewLengthSec, Math.max(0, duration - clampedStart))
  const windowPct = duration > 0 ? (previewLengthSec / duration) * 100 : 0
  const leftPct = duration > 0 ? (clampedStart / duration) * 100 : 0

  useEffect(() => {
    if (durationSec != null && durationSec > 0) {
      setLocalDuration(durationSec)
    }
  }, [durationSec])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    setLoadError('')
    setPlaying(false)

    const onLoaded = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      setLocalDuration(audio.duration)
      const max = Math.max(0, audio.duration - previewLengthSec)
      const nextStart = Math.min(Math.max(0, startRef.current), max)
      onChangeRef.current(nextStart, audio.duration)
    }
    const onError = () => setLoadError('Could not load audio for preview picker')
    const onEnded = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    audio.load()

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioSrc, previewLengthSec])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !playing) return

    const onTimeUpdate = () => {
      if (audio.currentTime >= endSec - 0.05) {
        audio.pause()
        setPlaying(false)
      }
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [playing, endSec])

  const handleSlider = (value: number) => {
    const next = Math.min(Math.max(0, value), maxStart)
    onChange(next, duration || localDuration)
  }

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    pauseAllExceptAudio(audio)
    audio.currentTime = clampedStart
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setLoadError('Playback blocked — try again')
      setPlaying(false)
    }
  }

  if (!audioSrc) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-wider text-gold mb-1">Preview region</p>
        <p className="text-sm text-gray-500">Upload an MP3 to choose which part visitors hear.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold">Preview region</p>
          <p className="text-sm text-gray-400 mt-0.5">
            Visitors hear {previewLengthSec}s starting at {formatTime(clampedStart)}
          </p>
        </div>
        {fullFileHref ? (
          <a
            href={fullFileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-white shrink-0"
          >
            Open full file
          </a>
        ) : null}
      </div>

      <audio ref={audioRef} src={audioSrc} preload="metadata" className="hidden" />

      <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 bg-gold/70 rounded-full"
          style={{ left: `${leftPct}%`, width: `${Math.max(windowPct, 2)}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={maxStart || 0}
        step={0.1}
        value={clampedStart}
        disabled={duration <= previewLengthSec}
        onChange={(e) => handleSlider(Number(e.target.value))}
        className="w-full accent-gold"
        aria-label="Preview start time"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
        <span>
          {formatTime(clampedStart)} – {formatTime(endSec)}
          {duration > 0 ? ` · track ${formatTime(duration)}` : ''}
        </span>
        <button
          type="button"
          onClick={togglePlay}
          className="px-3 py-1.5 rounded-full border border-gold/40 text-gold hover:bg-gold/10 uppercase tracking-wider text-[10px]"
        >
          {playing ? 'Stop' : 'Play preview'}
        </button>
      </div>

      <input type="hidden" name="preview_start_sec" value={String(clampedStart)} />
      <input
        type="hidden"
        name="track_duration_sec"
        value={duration > 0 ? String(duration) : ''}
      />

      {loadError ? <p className="text-xs text-red-400">{loadError}</p> : null}
    </div>
  )
}
