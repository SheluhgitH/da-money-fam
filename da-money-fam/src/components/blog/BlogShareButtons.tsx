'use client'

import { useState } from 'react'

interface BlogShareButtonsProps {
  title: string
  slug: string
}

export default function BlogShareButtons({ title, slug }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/blog/${slug}`
      : `https://damoneyfam.com/blog/${slug}`

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-gray-500 text-xs uppercase tracking-widest">Share</span>
      <button
        type="button"
        onClick={copyLink}
        className="px-4 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-lg text-gray-300 hover:border-gold/50 hover:text-gold transition-colors"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-lg text-gray-300 hover:border-gold/50 hover:text-gold transition-colors"
      >
        X
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 text-xs uppercase tracking-widest border border-white/10 rounded-lg text-gray-300 hover:border-gold/50 hover:text-gold transition-colors"
      >
        Facebook
      </a>
    </div>
  )
}
