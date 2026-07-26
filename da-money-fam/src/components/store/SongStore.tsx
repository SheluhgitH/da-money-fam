'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { PublicSong } from '@/types/store'
import PreviewPlayer from './PreviewPlayer'
import SongComments from './SongComments'
import SongShare from './SongShare'
import { useAuth } from '@/contexts/AuthProvider'
import { useMiniCart } from '@/contexts/MiniCartContext'
import { scrollRevealViewport, scrollRevealInView } from '@/lib/motion'
import { SONG_BUNDLES } from '@/lib/bundles'
import { FAN_CLUB_PREVIEW_DURATION_SEC, PREVIEW_DURATION_SEC } from '@/lib/audio-constants'
import { canPurchaseSong, hasEarlyAccessToSong } from '@/lib/fan-perks'
import SocialProofTicker from '@/components/SocialProofTicker'

const PromotedAlbumAnimation = dynamic(() => import('./PromotedAlbumAnimation'), {
  ssr: false,
})

function songAccessLabel(song: PublicSong, level: number, fanClub: boolean): string | null {
  if (song.owned) return null
  if (song.access === 'exclusive') {
    return canPurchaseSong(song, new Date(), level, fanClub) ? 'Fam Exclusive' : 'Fam Exclusive — Locked'
  }
  if (song.access === 'early' && !song.for_sale) {
    if (hasEarlyAccessToSong(song, new Date(), level, fanClub)) return 'Early Access'
    return 'Early Drop'
  }
  if (!song.for_sale) return 'Coming Soon'
  return null
}

function CountdownTimer({ releaseDate }: { releaseDate: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const target = new Date(releaseDate + 'T12:00:00').getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) {
        setRemaining('Dropping soon')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const mins = Math.floor((diff / (1000 * 60)) % 60)
      setRemaining(`${days}d ${hours}h ${mins}m`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [releaseDate])

  if (!remaining) return null
  return (
    <p className="text-purple-200 text-xs font-mono mt-2">
      Drop in: <span className="text-gold">{remaining}</span>
    </p>
  )
}

function DropWaitlist({ songId }: { songId: string }) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to join waitlist')
      setStatus('done')
      setMessage("You're on the list — we'll notify you on drop day.")
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to join waitlist')
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <p className="text-[10px] text-purple-200 uppercase tracking-wider font-bold">
        Notify me when this drops
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={user?.email || 'your@email.com'}
          required
          className="flex-1 px-3 py-2 bg-black/50 border border-purple-400/30 rounded-lg text-white text-xs placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'done'}
          className="px-4 py-2 bg-purple-500/30 border border-purple-400/40 text-purple-100 text-[10px] font-bold uppercase rounded-lg hover:bg-purple-500/50 disabled:opacity-50"
        >
          {status === 'done' ? 'Joined' : status === 'loading' ? '...' : 'Join'}
        </button>
      </div>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message}</p>
      )}
    </form>
  )
}

function BundleCard({
  songs,
  onPurchase,
  purchasing,
}: {
  songs: PublicSong[]
  onPurchase: () => void
  purchasing: boolean
}) {
  const bundle = SONG_BUNDLES['starter-pack']
  const bundleSongs = bundle.song_ids
    .map((id) => songs.find((s) => s.id === id))
    .filter(Boolean) as PublicSong[]
  const ownsAny = bundleSongs.some((s) => s.owned)
  const unavailable = bundleSongs.length < bundle.song_ids.length || bundleSongs.some((s) => !s.for_sale)

  if (unavailable || ownsAny) return null

  return (
    <div className="mb-10 rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-900/30 via-black/60 to-black p-6 md:p-8">
      <p className="text-purple-200 text-[10px] font-bold uppercase tracking-[4px] mb-2">Fans also bought</p>
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex -space-x-3">
          {bundleSongs.map((song) => (
            <img
              key={song.id}
              src={song.album_cover_path}
              alt={song.title}
              className="w-16 h-16 rounded-lg border-2 border-black object-cover"
            />
          ))}
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-2xl text-white mb-1">{bundle.name}</h3>
          <p className="text-gray-400 text-sm mb-2">{bundle.description}</p>
          <p className="text-gold font-mono text-xl">${bundle.price.toFixed(2)} <span className="text-gray-500 text-sm line-through ml-2">$10</span></p>
        </div>
        <button
          type="button"
          onClick={onPurchase}
          disabled={purchasing}
          className="shrink-0 bg-gold text-black text-xs font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white disabled:opacity-50"
        >
          {purchasing ? 'Redirecting...' : 'Get Bundle'}
        </button>
      </div>
    </div>
  )
}

function PromotedHero({
  song,
  onPurchase,
  onToggleFavorite,
  purchasingId,
  previewDurationSec,
  canBuy,
  accessLabel,
}: {
  song: PublicSong
  onPurchase: (song: PublicSong) => void
  onToggleFavorite: (song: PublicSong) => void
  purchasingId: string | null
  previewDurationSec: number
  canBuy: boolean
  accessLabel: string | null
}) {
  const isPurchasing = purchasingId === song.id
  const dropPending = !song.for_sale && !!song.release_date && song.access !== 'exclusive'

  return (
    <motion.div
      id={`song-${song.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={scrollRevealViewport}
      className="mb-12 rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/10 via-black/60 to-black overflow-hidden"
    >
      <div className="grid md:grid-cols-2 gap-0">
        <div className="relative h-64 md:h-auto min-h-[280px]">
          <img
            src={song.album_cover_path}
            alt={`${song.title} cover`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/80 md:block hidden" />
          <div className="absolute bottom-4 left-4 right-4 md:hidden">
            {song.preview_available && (
              <PreviewPlayer
                songId={song.id}
                owned={song.owned}
                title={song.title}
                artist={song.artist}
                cover={song.album_cover_path}
                price={song.price}
                for_sale={song.for_sale || canBuy}
                previewDurationSec={previewDurationSec}
              />
            )}
          </div>
        </div>
        <div className="p-6 md:p-10 flex flex-col justify-center">
          <span className="text-gold text-[10px] font-bold tracking-[4px] uppercase mb-2">
            {accessLabel || (dropPending ? 'Exclusive Drop' : 'Featured Track')}
          </span>
          <h3 className="font-serif text-3xl md:text-4xl text-white mb-2">{song.title}</h3>
          <p className="text-gold text-sm uppercase tracking-wider mb-3">{song.artist}</p>
          {song.description && (
            <p className="text-gray-400 text-sm mb-4">{song.description}</p>
          )}
          {dropPending && song.release_date && !canBuy && (
            <>
              <CountdownTimer releaseDate={song.release_date} />
              <DropWaitlist songId={song.id} />
            </>
          )}
          <div className="hidden md:block mt-4 mb-4">
            {song.preview_available && (
              <PreviewPlayer
                songId={song.id}
                owned={song.owned}
                title={song.title}
                artist={song.artist}
                cover={song.album_cover_path}
                price={song.price}
                for_sale={song.for_sale || canBuy}
                previewDurationSec={previewDurationSec}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {(song.for_sale || canBuy) && (
              <span className="text-gold font-mono text-xl">${song.price.toFixed(2)}</span>
            )}
            <SongShare song={song} />
            <button
              type="button"
              onClick={() => onToggleFavorite(song)}
              className="text-lg"
              aria-label="Favorite"
            >
              {song.is_favorited ? '❤️' : '🤍'}
            </button>
            {song.owned ? (
              <Link
                href="/library"
                className="bg-white/10 text-gold text-xs font-bold px-6 py-2.5 rounded-full uppercase tracking-wider hover:bg-gold hover:text-black"
              >
                In Library
              </Link>
            ) : canBuy ? (
              <button
                onClick={() => onPurchase(song)}
                disabled={isPurchasing}
                className="bg-gold text-black text-xs font-bold px-6 py-2.5 rounded-full uppercase tracking-wider hover:bg-white disabled:opacity-50"
              >
                {isPurchasing ? 'Redirecting...' : accessLabel?.includes('Early') ? 'Buy Early' : 'Buy Now'}
              </button>
            ) : (
              <Link
                href="/#reputation"
                className="bg-purple-600/40 border border-purple-400/40 text-purple-100 text-xs font-bold px-6 py-2.5 rounded-full uppercase tracking-wider"
              >
                Unlock with Fan Club / L5
              </Link>
            )}
          </div>
          <SongComments songId={song.id} initialCount={song.comment_count} defaultExpanded />
        </div>
      </div>
    </motion.div>
  )
}

function SongCard({
  song,
  onPurchase,
  onToggleFavorite,
  purchasingId,
  isFeatured,
  previewDurationSec,
  canBuy,
  accessLabel,
}: {
  song: PublicSong
  onPurchase: (song: PublicSong) => void
  onToggleFavorite: (song: PublicSong) => void
  purchasingId: string | null
  isFeatured?: boolean
  previewDurationSec: number
  canBuy: boolean
  accessLabel: string | null
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isPurchasing = purchasingId === song.id
  const { addItem } = useMiniCart()

  return (
    <motion.div
      layout
      id={`song-${song.id}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={scrollRevealViewport}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-500 backdrop-blur-sm ${
        isFeatured
          ? 'border-gold/50 bg-gradient-to-br from-gold/10 via-black/50 to-black/70 md:col-span-2 lg:col-span-2 shadow-[0_0_40px_rgba(212,175,55,0.08)]'
          : 'border-white/10 bg-black/50 hover:border-gold/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
      } ${song.is_promoted ? 'neon-border' : ''}`}
    >
      {song.is_promoted && (
        <div className="absolute top-4 left-4 z-20">
          <span className="bg-gold text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            New Drop
          </span>
        </div>
      )}

      {accessLabel && !song.owned && (
        <div className="absolute top-4 right-4 z-20">
          <span className="bg-purple-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-purple-300/40">
            {accessLabel}
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

      <div className={`relative ${isFeatured ? 'h-44 sm:h-56 md:h-72 lg:h-96' : 'h-44 sm:h-48 md:h-56'}`}>
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
            <PreviewPlayer
              songId={song.id}
              owned={song.owned}
              title={song.title}
              artist={song.artist}
              cover={song.album_cover_path}
              price={song.price}
              for_sale={song.for_sale || canBuy}
              previewDurationSec={previewDurationSec}
            />
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
          {song.for_sale || canBuy ? (
            <span className="text-gold font-mono text-lg">${song.price.toFixed(2)}</span>
          ) : (
            <span className="text-purple-300 text-xs font-bold uppercase tracking-wider">
              {accessLabel || 'Preview Only'}
            </span>
          )}
          <div className="flex items-center gap-2">
            <SongShare song={song} />
            {song.owned ? (
            <Link
              href="/library"
              className="bg-white/10 text-gold text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider hover:bg-gold hover:text-black transition-colors"
            >
              In Library
            </Link>
          ) : canBuy ? (
            <>
              <button
                type="button"
                onClick={() =>
                  addItem({
                    id: `song-${song.id}`,
                    kind: 'song',
                    title: song.title,
                    priceLabel: `$${song.price.toFixed(2)}`,
                    image: song.album_cover_path,
                    songId: song.id,
                  })
                }
                className="border border-gold/40 text-gold text-xs font-bold px-3 py-2 rounded-full uppercase tracking-wider hover:bg-gold/10 transition-colors"
              >
                + Bag
              </button>
              <button
                onClick={() => onPurchase(song)}
                disabled={isPurchasing}
                className="bg-gold text-black text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
              >
                {isPurchasing ? 'Redirecting...' : 'Purchase'}
              </button>
            </>
          ) : (
            <Link
              href="/#reputation"
              className="bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold px-5 py-2 rounded-full uppercase tracking-wider"
            >
              Unlock
            </Link>
          )}
          </div>
        </div>

        {!canBuy && song.release_date && new Date(song.release_date + 'T23:59:59') > new Date() && (
          <>
            <CountdownTimer releaseDate={song.release_date} />
            <DropWaitlist songId={song.id} />
          </>
        )}

        {(song.favorite_count || song.comment_count) ? (
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">
            {song.favorite_count ? `${song.favorite_count} fan${song.favorite_count === 1 ? '' : 's'} favorited` : ''}
            {song.favorite_count && song.comment_count ? ' · ' : ''}
            {song.comment_count ? `${song.comment_count} comment${song.comment_count === 1 ? '' : 's'}` : ''}
          </p>
        ) : null}

        <SongComments songId={song.id} initialCount={song.comment_count} />
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
  const [purchasingBundle, setPurchasingBundle] = useState(false)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [fanLevel, setFanLevel] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const headerRef = useRef(null)
  const isInView = useInView(headerRef, scrollRevealInView)

  const previewDurationSec = fanClubActive ? FAN_CLUB_PREVIEW_DURATION_SEC : PREVIEW_DURATION_SEC

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

    const params = new URLSearchParams(window.location.search)
    const songId = params.get('song')
    if (songId) {
      setTimeout(() => {
        const el = document.getElementById(`song-${songId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 600)
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setFanClubActive(false)
      setFanLevel(1)
      return
    }
    fetch('/api/user/entitlements')
      .then((r) => r.json())
      .then((data) => {
        setFanClubActive(Boolean(data.fan_club))
        setFanLevel(Number(data.level) || 1)
      })
      .catch(() => {
        setFanClubActive(false)
        setFanLevel(1)
      })
  }, [user])

  const songCanBuy = (song: PublicSong) =>
    !song.owned && canPurchaseSong(song, new Date(), fanLevel, fanClubActive)

  const handleBundlePurchase = async () => {
    setPurchasingBundle(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle_id: 'starter-pack' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setPurchasingBundle(false)
    }
  }

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
  const heroSong = promoted[0] || songs[0]
  const gridPromoted = heroSong ? promoted.filter((s) => s.id !== heroSong.id) : promoted

  return (
    <section id="store" className="max-w-7xl mx-auto">
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 md:mb-12 lg:mb-16"
      >
        <span className="text-gold text-[10px] sm:text-xs font-bold tracking-[3px] sm:tracking-[5px] uppercase">New Drops</span>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mt-3 md:mt-4 gold-gradient">
          Buy The Music
        </h2>
        <p className="text-gray-400 text-sm sm:text-base md:text-lg mt-3 md:mt-4 max-w-2xl mx-auto px-2">
          Preview {previewDurationSec} seconds free{fanClubActive ? ' (Fan Club)' : ''}. Sign in to save favorites and unlock your library after purchase.
        </p>
      </motion.div>

      <SocialProofTicker />

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
          <BundleCard songs={songs} onPurchase={handleBundlePurchase} purchasing={purchasingBundle} />

          {heroSong && (
            <PromotedHero
              song={heroSong}
              onPurchase={handlePurchase}
              onToggleFavorite={handleToggleFavorite}
              purchasingId={purchasingId}
              previewDurationSec={previewDurationSec}
              canBuy={songCanBuy(heroSong)}
              accessLabel={songAccessLabel(heroSong, fanLevel, fanClubActive)}
            />
          )}

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
                    previewDurationSec={previewDurationSec}
                    canBuy={songCanBuy(song)}
                    accessLabel={songAccessLabel(song, fanLevel, fanClubActive)}
                  />
                ))}
              </div>
            </div>
          )}

          {gridPromoted.length > 0 && (
            <div>
              <h3 className="text-gold text-sm uppercase tracking-[4px] mb-6">Promoted Releases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridPromoted.map((song, index) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onPurchase={handlePurchase}
                    onToggleFavorite={handleToggleFavorite}
                    purchasingId={purchasingId}
                    isFeatured={index === 0}
                    previewDurationSec={previewDurationSec}
                    canBuy={songCanBuy(song)}
                    accessLabel={songAccessLabel(song, fanLevel, fanClubActive)}
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
                    previewDurationSec={previewDurationSec}
                    canBuy={songCanBuy(song)}
                    accessLabel={songAccessLabel(song, fanLevel, fanClubActive)}
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
