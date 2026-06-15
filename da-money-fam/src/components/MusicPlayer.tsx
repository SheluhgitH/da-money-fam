'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { PublicSong } from '@/types/store'
import { PREVIEW_DURATION_SEC } from '@/lib/audio-constants'

const FADE_DURATION_MS = 1000
const FADE_INTERVAL_MS = 50

function pickRandomSong(songs: PublicSong[], excludeId?: string): PublicSong | null {
  if (songs.length === 0) return null
  const pool = excludeId ? songs.filter((s) => s.id !== excludeId) : songs
  const pickFrom = pool.length > 0 ? pool : songs
  return pickFrom[Math.floor(Math.random() * pickFrom.length)]
}

export default function MusicPlayer() {
  const [currentSong, setCurrentSong] = useState<PublicSong | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume] = useState(0.75)
  const [loading, setLoading] = useState(true)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 })
  const volumeRef = useRef(volume)
  const songsRef = useRef<PublicSong[]>([])
  const currentSongIdRef = useRef<string | null>(null)
  const transitioningRef = useRef(false)
  const previewEndedRef = useRef(false)
  const wantsPlayRef = useRef(true)
  const inViewRetryRef = useRef(false)

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  useEffect(() => {
    currentSongIdRef.current = currentSong?.id ?? null
    previewEndedRef.current = false
    inViewRetryRef.current = false
  }, [currentSong])

  const fadeAudio = useCallback(
    (audio: HTMLAudioElement, startVolume: number, endVolume: number, duration: number) => {
      const volumeChange = endVolume - startVolume
      const steps = duration / FADE_INTERVAL_MS
      let currentStep = 0

      return new Promise<void>((resolve) => {
        const fadeInterval = setInterval(() => {
          currentStep++
          const newVolume = startVolume + volumeChange * (currentStep / steps)
          audio.volume = Math.max(0, Math.min(1, newVolume))

          if (currentStep >= steps) {
            clearInterval(fadeInterval)
            audio.volume = Math.max(0, Math.min(1, endVolume))
            resolve()
          }
        }, FADE_INTERVAL_MS)
      })
    },
    []
  )

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentSong) return false

    try {
      audio.volume = 0
      await audio.play()
      setIsPlaying(true)
      setAutoplayBlocked(false)
      wantsPlayRef.current = true
      await fadeAudio(audio, 0, volumeRef.current, FADE_DURATION_MS)
      return true
    } catch {
      setIsPlaying(false)
      setAutoplayBlocked(true)
      return false
    }
  }, [currentSong, fadeAudio])

  const advanceToNext = useCallback(async () => {
    if (transitioningRef.current) return
    transitioningRef.current = true

    const audio = audioRef.current
    if (audio) {
      await fadeAudio(audio, audio.volume, 0, FADE_DURATION_MS)
      audio.pause()
      audio.currentTime = 0
    }

    const next = pickRandomSong(songsRef.current, currentSongIdRef.current ?? undefined)
    if (next) {
      setProgress(0)
      wantsPlayRef.current = true
      setCurrentSong(next)
    }

    transitioningRef.current = false
  }, [fadeAudio])

  // Load song catalog once
  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => {
        songsRef.current = data.songs || []
        const first = pickRandomSong(songsRef.current)
        if (first) {
          wantsPlayRef.current = true
          setCurrentSong(first)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Audio event listeners (stable — only attach once)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.loop = false

    const updateProgress = () => {
      if (audio.paused || audio.currentTime < 0.25) return

      const previewEnd = Math.min(
        Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : PREVIEW_DURATION_SEC,
        PREVIEW_DURATION_SEC
      )

      if (audio.currentTime >= previewEnd - 0.1) {
        if (!previewEndedRef.current) {
          previewEndedRef.current = true
          void advanceToNext()
        }
        setProgress(100)
        return
      }

      setProgress((audio.currentTime / previewEnd) * 100)
    }

    const onPause = () => setIsPlaying(false)
    const onPlaying = () => setIsPlaying(true)

    const onEnded = () => {
      if (!previewEndedRef.current) {
        previewEndedRef.current = true
        void advanceToNext()
      }
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('ended', onEnded)
    }
  }, [advanceToNext])

  // Load source and start when song changes
  useEffect(() => {
    const audio = audioRef.current
    if (!currentSong || !audio) return

    let cancelled = false

    const onCanPlay = () => {
      if (cancelled || !wantsPlayRef.current) return
      void startPlayback()
    }

    audio.addEventListener('canplay', onCanPlay)
    audio.src = `/api/preview/${currentSong.id}`
    audio.load()

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      onCanPlay()
    }

    return () => {
      cancelled = true
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [currentSong, startPlayback])

  // Retry when Now Playing scrolls into view (helps after autoplay block)
  useEffect(() => {
    if (!isInView || !autoplayBlocked || !currentSong || inViewRetryRef.current) return
    inViewRetryRef.current = true
    wantsPlayRef.current = true
    void startPlayback()
  }, [isInView, autoplayBlocked, currentSong, startPlayback])

  // Unlock audio on first user interaction anywhere on the page
  useEffect(() => {
    const unlock = () => {
      if (!currentSong || !wantsPlayRef.current) return
      const audio = audioRef.current
      if (audio?.paused) {
        void startPlayback()
      }
    }

    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [currentSong, startPlayback])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      wantsPlayRef.current = false
      fadeAudio(audio, audio.volume, 0, FADE_DURATION_MS).then(() => {
        audio.pause()
        setIsPlaying(false)
      })
    } else {
      wantsPlayRef.current = true
      void startPlayback()
    }
  }

  const playNext = () => {
    void advanceToNext()
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <section id="music" ref={sectionRef} className="max-w-7xl mx-auto">
      <audio ref={audioRef} preload="auto" controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} />
      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="text-center mb-16"
      >
        <motion.h2
          variants={itemVariants}
          className="font-serif text-4xl md:text-6xl font-bold mb-4 gold-gradient"
        >
          Now Playing
        </motion.h2>
        <motion.p variants={itemVariants} className="text-gray-400 text-lg">
          {PREVIEW_DURATION_SEC}s previews — purchase to unlock full tracks
        </motion.p>
        {autoplayBlocked && !isPlaying && currentSong && (
          <motion.p variants={itemVariants} className="text-gold/80 text-sm mt-2">
            Tap play to start the music
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="mb-12"
      >
        <motion.div
          variants={itemVariants}
          className="glass-gold rounded-2xl p-8 md:p-12 max-w-4xl mx-auto"
        >
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-64 h-64 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border relative overflow-hidden">
                {currentSong?.album_cover_path ? (
                  <Image
                    src={currentSong.album_cover_path}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    width={256}
                    height={256}
                  />
                ) : (
                  <svg className="w-24 h-24 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="font-serif text-3xl font-bold mb-2">
                  {currentSong?.title || 'No song playing'}
                </h3>
                <p className="text-gold text-lg mb-4">{currentSong?.artist || ''}</p>

                <div className="mb-6">
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-gold to-gold-light"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-6">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    className="w-16 h-16 bg-gold rounded-full flex items-center justify-center neon-border"
                  >
                    {isPlaying ? (
                      <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={playNext}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-gold"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </section>
  )
}
