'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import PreviewPlayer from '@/components/store/PreviewPlayer'
import { useAuth } from '@/contexts/AuthProvider'
import { groupCatalogArtists, type CatalogArtist } from '@/lib/artist-catalog'
import { FAN_CLUB_PREVIEW_DURATION_SEC, PREVIEW_DURATION_SEC } from '@/lib/audio-constants'
import { canPurchaseSong } from '@/lib/fan-perks'
import { navigateHomepageSection } from '@/lib/homepage-tabs'
import type { PublicSong } from '@/types/store'

const DRAG_THRESHOLD = 60
const MAX_VISIBLE_OFFSET = 2
const NUDGE_MS = 2800

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

function shortestOffset(index: number, active: number, length: number) {
  let raw = index - active
  if (raw > length / 2) raw -= length
  if (raw < -length / 2) raw += length
  return raw
}

function styleForOffset(offset: number, reducedMotion: boolean) {
  const abs = Math.abs(offset)
  if (abs > MAX_VISIBLE_OFFSET) {
    return {
      x: offset * 140,
      scale: 0.5,
      rotateY: 0,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none' as const,
    }
  }

  if (reducedMotion) {
    return {
      x: offset * 180,
      scale: offset === 0 ? 1 : 0.88,
      rotateY: 0,
      opacity: offset === 0 ? 1 : 0.5,
      zIndex: 10 - abs,
      pointerEvents: offset === 0 ? ('auto' as const) : ('none' as const),
    }
  }

  return {
    x: offset * 128,
    scale: offset === 0 ? 1 : abs === 1 ? 0.82 : 0.66,
    rotateY: offset === 0 ? 0 : offset < 0 ? 22 : -22,
    opacity: offset === 0 ? 1 : abs === 1 ? 0.7 : 0.32,
    zIndex: 10 - abs,
    pointerEvents: offset === 0 ? ('auto' as const) : ('none' as const),
  }
}

export default function ArtistMusicStrip() {
  const { user } = useAuth()
  const reducedMotion = useReducedMotion()
  const [artists, setArtists] = useState<CatalogArtist[]>([])
  const [loaded, setLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState<CatalogArtist | null>(null)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [fanLevel, setFanLevel] = useState(1)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const nudged = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  const previewDurationSec = fanClubActive ? FAN_CLUB_PREVIEW_DURATION_SEC : PREVIEW_DURATION_SEC
  const count = artists.length
  const showNav = count > 1
  const selected = artists[activeIndex]

  const loadSongs = useCallback(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => {
        setArtists(groupCatalogArtists(data.songs || []))
      })
      .catch(() => setArtists([]))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    loadSongs()
  }, [loadSongs, user])

  useEffect(() => {
    if (!open) return
    const next = artists.find((a) => a.key === open.key)
    if (next) setOpen(next)
  }, [artists, open?.key])

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

  const goTo = useCallback(
    (next: number) => {
      setActiveIndex(wrapIndex(next, count))
    },
    [count]
  )
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  useEffect(() => {
    setActiveIndex(0)
    nudged.current = false
  }, [artists])

  useEffect(() => {
    if (reducedMotion || count < 3 || paused || dragging || open || nudged.current) return
    const id = window.setTimeout(() => {
      if (nudged.current) return
      nudged.current = true
      setActiveIndex((i) => wrapIndex(i + 1, count))
    }, NUDGE_MS)
    return () => window.clearTimeout(id)
  }, [reducedMotion, count, paused, dragging, open])

  useEffect(() => {
    const el = stageRef.current
    if (!el || !showNav) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'Enter' && selected) {
        e.preventDefault()
        setOpen(selected)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [showNav, goPrev, goNext, selected])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false)
    if (info.offset.x < -DRAG_THRESHOLD || info.velocity.x < -400) goNext()
    else if (info.offset.x > DRAG_THRESHOLD || info.velocity.x > 400) goPrev()
  }

  const handlePurchase = async (song: PublicSong) => {
    setPurchasingId(song.id)
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch {
      setPurchasingId(null)
    }
  }

  const handleToggleFavorite = async (song: PublicSong) => {
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent('/?tab=discover')}`
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

  const openInMusic = (songId: string) => {
    setOpen(null)
    navigateHomepageSection('store')
    window.setTimeout(() => {
      document.getElementById(`song-${songId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 400)
  }

  if (!loaded || artists.length === 0) return null

  const featured = open ? open.songs[0] : null
  const rest = open ? open.songs.slice(1) : []

  return (
    <section id="artist-music" className="max-w-7xl mx-auto relative">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.14),_transparent_62%)]" />

      <div className="text-center mb-6 md:mb-10">
        <p className="text-gold text-[10px] sm:text-xs font-bold tracking-[5px] uppercase mb-3">The artists</p>
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold gold-gradient mb-3">
          Faces behind the music
        </h2>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
          Swipe the faces. Tap one to play their catalog.
        </p>
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div
          ref={stageRef}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label="Artists with music"
          className="artist-runway-stage relative h-[420px] sm:h-[460px] md:h-[520px] outline-none select-none"
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            drag={showNav ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragStart={() => setDragging(true)}
            onDragEnd={onDragEnd}
            style={{ touchAction: 'pan-y' }}
          >
            {artists.map((artist, index) => {
              const offset = shortestOffset(index, activeIndex, count)
              const style = styleForOffset(offset, Boolean(reducedMotion))
              const isActive = offset === 0
              return (
                <motion.button
                  key={artist.key}
                  type="button"
                  aria-hidden={!isActive}
                  tabIndex={isActive ? 0 : -1}
                  className={`stream-wheel-card group absolute w-[160px] sm:w-[200px] md:w-[230px] rounded-2xl overflow-hidden border text-left transition-[box-shadow,border-color] duration-300 ${
                    isActive
                      ? 'border-gold/55 shadow-[0_0_48px_rgba(212,175,55,0.28)]'
                      : 'border-white/10'
                  }`}
                  initial={false}
                  animate={{
                    x: style.x,
                    scale: style.scale,
                    rotateY: style.rotateY,
                    opacity: style.opacity,
                    zIndex: style.zIndex,
                  }}
                  whileHover={isActive && !reducedMotion ? { y: -8 } : undefined}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  style={{
                    pointerEvents: style.pointerEvents,
                    transformPerspective: 1400,
                  }}
                  onClick={() => {
                    if (!isActive) {
                      goTo(index)
                      return
                    }
                    setOpen(artist)
                  }}
                >
                  <div className="relative aspect-[3/4] bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artist.photo}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1.5 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-widest">
                        Listen
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="font-serif text-white text-lg leading-tight">{artist.name}</p>
                      <p className="text-gold text-[10px] uppercase tracking-wider mt-1">
                        {artist.songs.length} track{artist.songs.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>

          {showNav ? (
            <>
              <button
                type="button"
                aria-label="Previous artist"
                onClick={goPrev}
                className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:bg-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next artist"
                onClick={goNext}
                className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-gold text-black flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:bg-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : null}
        </div>

        {showNav ? (
          <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Artist slides">
            {artists.map((artist, i) => (
              <button
                key={artist.key}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={artist.name}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? 'w-6 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {open && featured ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close catalog"
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setOpen(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="artist-catalog-title"
              initial={{ opacity: 0, y: 28, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-gold/30 bg-[#0a0a0a] shadow-[0_0_80px_rgba(255,215,0,0.12)]"
            >
              <div className="relative h-48 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.photo} alt="" className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={open.photo}
                    alt=""
                    className="w-20 h-28 object-cover object-top rounded-xl border border-gold/40"
                  />
                  <div>
                    <p className="text-gold text-[10px] uppercase tracking-[0.3em]">
                      {open.role || 'Artist'} · {open.songs.length} track{open.songs.length === 1 ? '' : 's'}
                    </p>
                    <h3 id="artist-catalog-title" className="font-serif text-3xl text-white">
                      {open.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white/80 hover:text-gold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="rounded-xl border border-gold/25 overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featured.album_cover_path} alt="" className="w-full h-44 object-cover" />
                  <div className="p-3 space-y-2">
                    <p className="text-gold text-[10px] uppercase tracking-widest">Featured</p>
                    <p className="font-serif text-xl text-white">{featured.title}</p>
                    {featured.preview_available ? (
                      <PreviewPlayer
                        songId={featured.id}
                        owned={featured.owned}
                        title={featured.title}
                        artist={featured.artist}
                        cover={featured.album_cover_path}
                        price={featured.price}
                        for_sale={featured.for_sale}
                        previewDurationSec={previewDurationSec}
                      />
                    ) : null}
                    <SongActions
                      song={featured}
                      canBuy={canPurchaseSong(featured, new Date(), fanLevel, fanClubActive)}
                      purchasing={purchasingId === featured.id}
                      onPurchase={() => handlePurchase(featured)}
                      onFavorite={() => handleToggleFavorite(featured)}
                      onOpenInMusic={() => openInMusic(featured.id)}
                    />
                  </div>
                </div>

                {rest.map((song) => (
                  <div
                    key={song.id}
                    className="flex gap-3 items-center rounded-xl border border-white/10 bg-white/[0.03] p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={song.album_cover_path} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-white text-sm truncate">{song.title}</p>
                      {song.preview_available ? (
                        <PreviewPlayer
                          songId={song.id}
                          owned={song.owned}
                          title={song.title}
                          artist={song.artist}
                          cover={song.album_cover_path}
                          price={song.price}
                          for_sale={song.for_sale}
                          previewDurationSec={previewDurationSec}
                        />
                      ) : null}
                      <SongActions
                        song={song}
                        canBuy={canPurchaseSong(song, new Date(), fanLevel, fanClubActive)}
                        purchasing={purchasingId === song.id}
                        onPurchase={() => handlePurchase(song)}
                        onFavorite={() => handleToggleFavorite(song)}
                        onOpenInMusic={() => openInMusic(song.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function SongActions({
  song,
  canBuy,
  purchasing,
  onPurchase,
  onFavorite,
  onOpenInMusic,
}: {
  song: PublicSong
  canBuy: boolean
  purchasing: boolean
  onPurchase: () => void
  onFavorite: () => void
  onOpenInMusic: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canBuy && !song.owned ? (
        <button
          type="button"
          onClick={onPurchase}
          disabled={purchasing}
          className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold text-black disabled:opacity-50"
        >
          {purchasing ? '…' : `Buy $${song.price.toFixed(2)}`}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onFavorite}
        className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/15 text-white/70"
      >
        {song.is_favorited ? 'Favorited' : 'Favorite'}
      </button>
      <button
        type="button"
        onClick={onOpenInMusic}
        className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/40 text-gold"
      >
        Open in Music
      </button>
    </div>
  )
}
