'use client'

import Image from 'next/image'
import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PublicSong } from '@/types/store'

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

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.loop = false

      const onEnded = () => {
        setIsPlaying(false)
        // Potentially trigger next song here if a queue is implemented globally
      }

      audio.addEventListener('ended', onEnded)

      return () => {
        audio.removeEventListener('ended', onEnded)
      }
    }
  }, [volume])

  const playSong = (song: PublicSong) => {
    console.log('GlobalAudioPlayer: playSong', song.id, song.title)
    setCurrentSong(song)
    if (audioRef.current) {
      audioRef.current.src = `/api/preview/${song.id}`
      audioRef.current.load()
      audioRef.current.play().catch((err) => {
        console.error('GlobalAudioPlayer: play failed', err)
      })
      setIsPlaying(true)
    }
  }

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play().catch((err) => {
          console.error('GlobalAudioPlayer: toggle play failed', err)
        })
      }
      setIsPlaying(!isPlaying)
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
      <audio ref={audioRef} />
      <AnimatePresence>
        {currentSong && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="fixed bottom-4 right-4 z-50 glass-gold rounded-xl p-4 flex items-center shadow-lg"
          >
            <Image
              src={currentSong.album_cover_path || '/path/to/default-cover.png'}
              alt={currentSong.title}
              className="w-12 h-12 rounded-lg mr-4 object-cover"
              width={48}
              height={48}
            />
            <div className="flex-1 text-white text-sm mr-4">
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
                className="w-24 h-1 appearance-none rounded-full bg-gray-700 outline-none focus:outline-none focus:ring-2 focus:ring-gold accent-gold"
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
