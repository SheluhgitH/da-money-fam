'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthProvider'
import type { LibraryItem } from '@/types/store'

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    fetch('/api/library')
      .then((r) => r.json())
      .then((data) => setLibrary(data.library || []))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
        Loading your library...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-matte-black py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl gold-gradient mb-2">My Library</h1>
        <p className="text-gray-400 mb-10">Your purchased tracks — stream or download anytime</p>

        {library.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-gray-400 mb-6">You haven&apos;t purchased any tracks yet.</p>
            <Link
              href="/#store"
              className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-white transition-colors"
            >
              Browse New Drops
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {library.map((item) => (
              <div
                key={item.order_id}
                className="flex items-center gap-6 glass rounded-2xl p-5 border border-white/10"
              >
                <Image
                  src={item.album_cover_path}
                  alt={item.song_title}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover' }}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{item.song_title}</h3>
                  <p className="text-gray-500 text-xs">
                    Purchased {new Date(item.purchased_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlayingId(playingId === item.song_id ? null : item.song_id)}
                    className="px-4 py-2 border border-gold/40 text-gold text-xs font-bold rounded-full uppercase hover:bg-gold hover:text-black transition-colors"
                  >
                    {playingId === item.song_id ? 'Hide' : 'Play'}
                  </button>
                  {item.download_token && (
                    <a
                      href={`/api/download/${item.download_token}`}
                      className="px-4 py-2 bg-gold text-black text-xs font-bold rounded-full uppercase hover:bg-white transition-colors"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {playingId && (
          <div className="mt-6 glass rounded-2xl p-4">
            <audio
              src={`/api/library/stream/${playingId}`}
              controls
              autoPlay
              className="w-full"
              controlsList="nodownload"
            />
          </div>
        )}

        <p className="text-center mt-8">
          <Link href="/" className="text-gold text-sm hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
