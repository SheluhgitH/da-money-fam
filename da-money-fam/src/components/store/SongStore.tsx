'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { PublicSong } from '@/types/store'
import PreviewPlayer from './PreviewPlayer'
import { useAuth } from '@/contexts/AuthProvider'

const PromotedAlbumAnimation = dynamic(() => import('./PromotedAlbumAnimation'), {
  ssr: false,
})

function SongCard({
  song,
  onPurchase,
  onToggleFavorite,
  purchasingId,
  isFeatured,
}: {
  song: PublicSong
  onPurchase: (song: PublicSong) => void
  onToggleFavorite: (song: PublicSong) => void
  purchasingId: string | null
  isFeatured?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isPurchasing = purchasingId === song.id

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
        isFeatured
          ? 'border-gold/50 bg-gradient-to-br from-gold/10 to-black/60 md:col-span-2 lg:col-span-2'
          : 'border-white/10 bg-black/40'
      } ${song.is_promoted ? 'neon-border' : ''}`}
    >
      {song.is_promoted && (
        <div className="absolute top-4 left-4 z-20">
          <span className="bg-gold text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            New Drop
          </span>
        </div>
      )}

      {!song.for_sale && (
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-purple-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-purple-300/40">
            Exclusive
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => onToggleFavorite(song)}
        className="absolute top-4 left-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-lg hover:scale-110 transition-transform"
        style={song.is_promoted ? { top: '3.25rem' } : undefined}
        aria-label={song.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {song.is_favorited ? '❤️' : '🤍'}
      </button>

      {song.owned && (
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
            Owned
          </span>
        </div>
      )}

      <div className={`relative ${isFeatured ? 'h-72 md:h-96' : 'h-56'}`}>
        {song.is_promoted && isHovered && (
          <PromotedAlbumAnimation coverUrl={song.album_cover_path} />
        )}
        <img
          src={song.album_cover_path}
          alt={`${song.title} cover`}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${song.is_promoted ? 'opacity-90' : 'opacity-80'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {song.preview_available && (
          <div className="absolute bottom-3 left-3 right-3">
            <PreviewPlayer songId={song.id} owned={song.owned} />
          </div>
        )}
      </div>

      <div className="p-5 relative z-10">
        <p className="text-gold text-xs uppercase tracking-[3px] mb-1">{song.artist}</p>
        <h3 className="font-serif text-xl md:text-2xl text-white mb-2">{song.title}</h3>
        {song.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">{song.description}</p>
        )}
        <div className="flex items-center justify-between">
          {song.for_sale ? (
            <span className="text-gold font-mono text-lg">${song.price.toFixed(2)}</span>
          ) : (
            <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">Preview Only</span>
          )}
          {song.owned ? (
            <Link
              href="/library"
              className="bg-white/10 text-gold text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider hover:bg-gold hover:text-black transition-colors"
            >
              In Library
            </Link>
          ) : song.for_sale ? (
            <button
              onClick={() => onPurchase(song)}
              disabled={isPurchasing}
              className="bg-gold text-black text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
            >
              {isPurchasing ? 'Redirecting...' : 'Purchase'}
            </button>
          ) : (
            <span className="bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider">
              Exclusive
            </span>
          )}
        </div>
      </div>

      {song.is_promoted && (
        <motion.div
          className="absolute -inset-1 rounded-2xl border border-gold/20 pointer-events-none"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  )
}

export default function SongStore() {
  const { user } = useAuth()
  const [songs, setSongs] = useState<PublicSong[]>([])
  const [recommendations, setRecommendations] = useState<PublicSong[]>([])
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const loadSongs = () => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => {
        setSongs(data.songs || [])
        setRecommendations(data.recommendations || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSongs()
  }, [user])

  const handlePurchase = async (song: PublicSong) => {
    setPurchasingId(song.id)
    setError('')

    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setPurchasingId(null)
    }
  }

  const handleToggleFavorite = async (song: PublicSong) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent('/#store')}`
      return
    }

    const isFav = song.is_favorited
    const res = await fetch(
      isFav ? `/api/favorites?song_id=${song.id}` : '/api/favorites',
      isFav
        ? { method: 'DELETE' }
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song_id: song.id }),
          }
    )

    if (res.ok) loadSongs()
  }

  const promoted = songs.filter((s) => s.is_promoted)
  const regular = songs.filter((s) => !s.is_promoted)

  return (
    <section id="store" ref={ref} className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <span className="text-gold text-xs font-bold tracking-[5px] uppercase">New Drops</span>
        <h2 className="font-serif text-4xl md:text-6xl font-bold mt-4 gold-gradient">
          Buy The Music
        </h2>
        <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">
          Preview 25 seconds free. Sign in to save favorites and unlock your library after purchase.
        </p>
      </motion.div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading store...</div>
      ) : songs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No songs available yet.</div>
      ) : (
        <div className="space-y-12">
          {user && recommendations.length > 0 && (
            <div>
              <h3 className="text-gold text-sm uppercase tracking-[4px] mb-6">Recommended For You</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((song) => (
                  <SongCard
                    key={`rec-${song.id}`}
                    song={song}
                    onPurchase={handlePurchase}
                    onToggleFavorite={handleToggleFavorite}
                    purchasingId={purchasingId}
                  />
                ))}
              </div>
            </div>
          )}

          {promoted.length > 0 && (
            <div>
              <h3 className="text-gold text-sm uppercase tracking-[4px] mb-6">Promoted Releases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {promoted.map((song, index) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPurchase={handlePurchase}
                    onToggleFavorite={handleToggleFavorite}
                    purchasingId={purchasingId}
                    isFeatured={index === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              <h3 className="text-white/60 text-sm uppercase tracking-[4px] mb-6">More Tracks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regular.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPurchase={handlePurchase}
                    onToggleFavorite={handleToggleFavorite}
                    purchasingId={purchasingId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
