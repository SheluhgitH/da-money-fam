'use client'

import { useState } from 'react'
import type { PublicSong } from '@/types/store'

type SongShareProps = {
  song: PublicSong
}

export default function SongShare({ song }: SongShareProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?song=${encodeURIComponent(song.id)}#store`
      : `/?song=${encodeURIComponent(song.id)}#store`

  const shareText = `Check out "${song.title}" by ${song.artist} on Da Money Fam`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: song.title,
          text: shareText,
          url: shareUrl,
        })
        return
      } catch {
        // fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
    }
  }

  const openTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-300 hover:text-gold hover:border-gold/40 transition-colors"
        aria-label="Share song"
        title={copied ? 'Link copied!' : 'Share'}
      >
        {copied ? (
          <span className="text-[10px] font-bold text-gold">OK</span>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={openTwitter}
        className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-300 hover:text-gold hover:border-gold/40 transition-colors"
        aria-label="Share on X"
        title="Share on X"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
    </div>
  )
}
