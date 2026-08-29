'use client'

import { useState } from 'react'
import { artistSharePath, slugifyArtistName } from '@/lib/artist-catalog'

const SITE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : 'https://damoneyfam.com'

/** Admin hint: shareable artist page URL derived from the artist name field. */
export default function ArtistShareUrlHint({ artistName }: { artistName: string }) {
  const [copied, setCopied] = useState(false)
  const slug = slugifyArtistName(artistName)
  if (!slug) return null

  const path = artistSharePath(artistName)
  const url = `${SITE}${path}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-sm space-y-1">
      <p className="text-gold text-[10px] uppercase tracking-widest">Artist share link</p>
      <p className="text-white/80 font-mono text-xs break-all">{url}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={copy}
          className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold text-black font-bold"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/40 text-gold"
        >
          Open
        </a>
      </div>
    </div>
  )
}
