'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePreviewPlayer } from '@/contexts/PreviewPlayerContext'
import { PREVIEW_DURATION_SEC } from '@/lib/audio-constants'

function findActiveAudio(songId: string): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null
  return document.querySelector(`audio[data-song-id="${songId}"]`)
}

export default function StickyPreviewBar() {
  const {
    activePreview,
    isPlaying,
    progress,
    previewEnded,
    purchasing,
    setIsPlaying,
    replayPreview,
    purchasePreviewSong,
  } = usePreviewPlayer()

  if (!activePreview) return null

  const togglePlay = () => {
    const audio = findActiveAudio(activePreview.songId)
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }
    if (previewEnded && !activePreview.owned) {
      void replayPreview()
      return
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }

  const durationLabel = activePreview.owned
    ? 'Full track'
    : previewEnded
      ? 'Preview again'
      : `${PREVIEW_DURATION_SEC}s preview`

  const priceLabel =
    typeof activePreview.price === 'number'
      ? `$${activePreview.price.toFixed(2)}`
      : null

  const endedHint = previewEnded && !activePreview.owned

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[900] glass-gold rounded-2xl border border-gold/30 p-3 shadow-2xl">
      <div className="flex items-center gap-3">
        {activePreview.cover ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
            <Image src={activePreview.cover} alt={activePreview.title} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-black/50 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gold uppercase tracking-wider truncate">{activePreview.artist}</p>
          <p className="text-white text-sm font-semibold truncate">{activePreview.title}</p>
          <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="text-[9px] text-gray-500 mt-0.5">{durationLabel}</p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full bg-gold text-black flex items-center justify-center shrink-0 text-xs hover:bg-white transition-colors ${
            endedHint ? 'ring-2 ring-gold/70 animate-pulse' : ''
          }`}
          aria-label={isPlaying ? 'Pause' : endedHint ? 'Play preview again' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        {activePreview.for_sale && !activePreview.owned ? (
          <button
            type="button"
            onClick={() => void purchasePreviewSong()}
            disabled={purchasing}
            className="text-[10px] font-bold uppercase tracking-wider text-gold hover:text-white shrink-0 disabled:opacity-50"
          >
            {purchasing ? '...' : priceLabel ? `Buy ${priceLabel}` : 'Buy'}
          </button>
        ) : activePreview.owned ? (
          <Link href="/library" className="text-[10px] font-bold uppercase tracking-wider text-gold shrink-0">
            Library
          </Link>
        ) : null}
      </div>
    </div>
  )
}
