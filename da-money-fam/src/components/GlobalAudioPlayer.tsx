'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, createContext, useContext, ReactNode, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PublicSong } from '@/types/store'
import { PREVIEW_DURATION_SEC, pauseAllExceptAudio } from '@/lib/audio-constants'

const FADE_DURATION_MS = 1000 // 1 second fade
const FADE_INTERVAL_MS = 50 // Update every 50ms

interface AudioPlayerContextType {
  currentSong: PublicSong | null
  isPlaying: boolean
  playSong: (song: PublicSong) => void
  togglePlayPause: () => void
  volume: number
  setVolume: (volume: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentSong, setCurrentSong] = useState<PublicSong | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.75)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Helper for fading audio
  const fadeAudio = useCallback((audio: HTMLAudioElement, startVolume: number, endVolume: number, duration: number) => {
    const volumeChange = endVolume - startVolume;
    const steps = duration / FADE_INTERVAL_MS;
    let currentStep = 0;

    return new Promise<void>((resolve) => {
      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = startVolume + (volumeChange * (currentStep / steps));
        audio.volume = Math.max(0, Math.min(1, newVolume)); // Clamp volume between 0 and 1

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          audio.volume = Math.max(0, Math.min(1, endVolume)); // Ensure final volume is exact
          resolve();
        }
      }, FADE_INTERVAL_MS);
    });
  }, []);

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.loop = false

      const onTimeUpdate = () => {
        if (audio.currentTime >= PREVIEW_DURATION_SEC) {
          audio.pause()
          audio.currentTime = PREVIEW_DURATION_SEC
          setIsPlaying(false)
        }
      }

      const onEnded = () => {
        setIsPlaying(false)
      }

      audio.addEventListener('timeupdate', onTimeUpdate)
      audio.addEventListener('ended', onEnded)

      return () => {
        audio.removeEventListener('timeupdate', onTimeUpdate)
        audio.removeEventListener('ended', onEnded)
      }
    }
  }, [volume])

  const playSong = useCallback(async (song: PublicSong) => {
    setCurrentSong(song)
    if (audioRef.current) {
      const audio = audioRef.current
      pauseAllExceptAudio(audio)
      audio.src = `/api/preview/${song.id}`
      audio.load()
      audio.play().then(() => fadeAudio(audio, 0, volume, FADE_DURATION_MS)).catch(() => {})
      setIsPlaying(true)
    }
  }, [fadeAudio, volume])

  useEffect(() => {
    const onPlay = (e: Event) => {
      const query = String((e as CustomEvent<{ query?: string }>).detail?.query || '')
        .trim()
        .toLowerCase()
      if (!query) return
      void fetch('/api/songs')
        .then((r) => r.json())
        .then((data) => {
          const songs = (Array.isArray(data.songs) ? data.songs : []) as PublicSong[]
          const match =
            songs.find(
              (s) =>
                s.title.toLowerCase().includes(query) || s.artist.toLowerCase().includes(query)
            ) || songs[0]
          if (match) void playSong(match)
        })
        .catch(() => {})
    }
    window.addEventListener('dmf-play-song', onPlay)
    return () => window.removeEventListener('dmf-play-song', onPlay)
  }, [playSong])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) {
        fadeAudio(audio, audio.volume, 0, FADE_DURATION_MS).then(() => {
          audio.pause()
          setIsPlaying(false)
        })
      } else {
        pauseAllExceptAudio(audio)
        audio.play().then(() => fadeAudio(audio, audio.volume, volume, FADE_DURATION_MS)).catch(() => {})
        setIsPlaying(true)
      }
    }
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        playSong,
        togglePlayPause,
        volume,
        setVolume,
      }}
    >
      {children}
      <audio ref={audioRef} preload="none" controlsList="nodownload noplaybackrate" onContextMenu={(e) => e.preventDefault()} />
      <AnimatePresence>
        {currentSong && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4 z-50 glass-gold rounded-none sm:rounded-xl p-3 sm:p-4 flex items-center shadow-lg max-w-full sm:max-w-md"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            <Image
              src={currentSong.album_cover_path || '/path/to/default-cover.png'}
              alt={currentSong.title}
              className="w-12 h-12 rounded-lg mr-4 object-cover"
              width={48}
              height={48}
            />
            <div className="flex-1 min-w-0 text-white text-sm mr-2 sm:mr-4">
              <p className="font-bold truncate">{currentSong.title}</p>
              <p className="text-gray-300 truncate">{currentSong.artist}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={togglePlayPause} className="text-white hover:text-gold transition-colors">
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="hidden sm:block w-24 h-1 appearance-none rounded-full bg-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-gold accent-gold"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AudioPlayerContext.Provider>
  )
}

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}
