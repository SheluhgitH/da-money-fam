'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import PreviewPlayer from '@/components/store/PreviewPlayer'
import { useAuth } from '@/contexts/AuthProvider'
import type { CatalogArtist } from '@/lib/artist-catalog'
import { artistSharePath } from '@/lib/artist-catalog'
import { FAN_CLUB_PREVIEW_DURATION_SEC, PREVIEW_DURATION_SEC } from '@/lib/audio-constants'
import { canPurchaseSong } from '@/lib/fan-perks'
import type { PublicSong } from '@/types/store'

export default function ArtistMusicPageClient({ artist }: { artist: CatalogArtist }) {
  const { user } = useAuth()
  const [songs, setSongs] = useState(artist.songs)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [fanLevel, setFanLevel] = useState(1)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const previewDurationSec = fanClubActive ? FAN_CLUB_PREVIEW_DURATION_SEC : PREVIEW_DURATION_SEC
  const featured = songs[0]
  const rest = songs.slice(1)

  const refresh = useCallback(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => {
        const list = (data.songs || []) as PublicSong[]
        const mine = list
          .filter((s) => s.artist.trim().toLowerCase() === artist.name.trim().toLowerCase())
          .sort((a, b) => Number(b.is_promoted) - Number(a.is_promoted))
        if (mine.length) setSongs(mine)
      })
      .catch(() => {})
  }, [artist.name])

  useEffect(() => {
    refresh()
  }, [refresh, user])

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
      window.location.href = `/login?redirect=${encodeURIComponent(artistSharePath(artist.name))}`
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
    if (res.ok) refresh()
  }

  const copyLink = async () => {
    const url = `${window.location.origin}${artistSharePath(artist.name)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (!featured) {
    return (
      <div className="text-center py-20 text-white/50 text-sm">No tracks yet.</div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-24">
      <div className="relative h-56 rounded-2xl overflow-hidden border border-gold/25 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artist.photo}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artist.photo}
            alt=""
            className="w-24 h-32 object-cover object-top rounded-xl border border-gold/40 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-gold text-[10px] uppercase tracking-[0.3em]">
              {artist.role || 'Artist'} · {songs.length} track{songs.length === 1 ? '' : 's'}
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-white leading-tight truncate">
              {artist.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={copyLink}
          className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-gold text-black font-bold"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <Link
          href="/?tab=music#store"
          className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-gold/30 text-gold hover:bg-gold/10"
        >
          All DMF music
        </Link>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-gold/25 overflow-hidden bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={featured.album_cover_path} alt="" className="w-full h-48 object-cover" />
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
            <SongRowActions
              song={featured}
              canBuy={canPurchaseSong(featured, new Date(), fanLevel, fanClubActive)}
              purchasing={purchasingId === featured.id}
              onPurchase={() => handlePurchase(featured)}
              onFavorite={() => handleToggleFavorite(featured)}
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
              <SongRowActions
                song={song}
                canBuy={canPurchaseSong(song, new Date(), fanLevel, fanClubActive)}
                purchasing={purchasingId === song.id}
                onPurchase={() => handlePurchase(song)}
                onFavorite={() => handleToggleFavorite(song)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SongRowActions({
  song,
  canBuy,
  purchasing,
  onPurchase,
  onFavorite,
}: {
  song: PublicSong
  canBuy: boolean
  purchasing: boolean
  onPurchase: () => void
  onFavorite: () => void
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
    </div>
  )
}
