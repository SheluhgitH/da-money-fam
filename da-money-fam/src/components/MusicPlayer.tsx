import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef } from 'react'
import SongBidding from './SongBidding'
import type { PublicSong } from '@/types/store'

const BID_WINDOW_START_SEC = 10 // Start bidding 10 seconds before song ends
const BID_WINDOW_END_SEC = 10 // Bidding continues 10 seconds after song ends

export default function MusicPlayer() {
  const [currentSong, setCurrentSong] = useState<PublicSong | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.75)
  const [biddingState, setBiddingState] = useState<{
    current_song: PublicSong | null
    bidding_active: boolean
    bidding_ends_at: number | null
    bids: { song_id: string; amount: number }[]
    all_songs: PublicSong[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const audioRef = useRef<HTMLAudioElement>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  const fetchBiddingState = useCallback(async () => {
    try {
      const res = await fetch('/api/bidding')
      const data = await res.json()
      if (res.ok) {
        console.log('MusicPlayer: bidding state refreshed', data)
        setBiddingState(data)
        setCurrentSong(data.current_song)
      } else {
        console.error('Failed to fetch bidding state:', data.error)
      }
    } catch (err) {
      console.error('Error fetching bidding state:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBiddingState()
    const interval = setInterval(fetchBiddingState, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [fetchBiddingState])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.loop = false // No loop for continuous queue

      const updateProgress = () => {
        if (audio.duration && currentSong) {
          const totalDuration = audio.duration
          const currentTime = audio.currentTime
          setProgress((currentTime / totalDuration) * 100)

          // Handle bidding window logic
          if (totalDuration - currentTime <= BID_WINDOW_START_SEC && !biddingState?.bidding_active) {
            // Activate bidding (if not already active)
            // This logic is mostly handled server-side now, client just reacts
          }
        }
      }

      const onEnded = () => {
        setIsPlaying(false)
        // Trigger server to advance song, then refetch bidding state
        // The server-side interval is responsible for this, client just re-polls
      }

      audio.addEventListener('timeupdate', updateProgress)
      audio.addEventListener('ended', onEnded)
      return () => {
        audio.removeEventListener('timeupdate', updateProgress)
        audio.removeEventListener('ended', onEnded)
      }
    }
  }, [currentSong, volume, biddingState])

  useEffect(() => {
    if (currentSong && audioRef.current) {
      console.log('MusicPlayer: loading song', currentSong.id, currentSong.title)
      audioRef.current.load() // Load new song
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error('MusicPlayer: autoplay failed', err)
        }) // Autoplay if already playing
      }
    }
  }, [currentSong, isPlaying])

  const togglePlay = () => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play().catch((err) => {
          console.error('MusicPlayer: play failed', err)
        })
      }
      setIsPlaying(!isPlaying)
    }
  }

  const playNext = () => {
    // This should trigger the server to advance the song
    // For now, it will be handled by the server's interval
  }

  const playPrev = () => {
    // Previous track logic needs to interact with the bidding queue or a history
    // For now, we will not implement a prev track for the dynamic queue
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }
  return (
    <section id="music" ref={ref} className="max-w-7xl mx-auto">
      <audio ref={audioRef} src={currentSong ? `/api/preview/${currentSong.id}` : ''} preload="metadata" />
      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="text-center mb-16"
      >
        <motion.h2
          variants={itemVariants}
          className="font-serif text-4xl md:text-6xl font-bold mb-4 gold-gradient"
        >
          Live Queue & Bidding
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-lg"
        >
          Influence the next track with your DMF Coinz!
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="mb-12"
      >
        <motion.div
          variants={itemVariants}
          className="glass-gold rounded-2xl p-8 md:p-12 max-w-4xl mx-auto"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-64 h-64 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border relative overflow-hidden">
              {currentSong?.album_cover_path ? (
                <Image src={currentSong.album_cover_path} alt={currentSong.title} className="w-full h-full object-cover" width={256} height={256} />
              ) : (
                <svg className="w-24 h-24 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="font-serif text-3xl font-bold mb-2">{currentSong?.title || 'No song playing'}</h3>
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
                {/* Previous button removed for dynamic queue */}
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

                {/* Next button removed for dynamic queue */}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="grid grid-cols-1 gap-6"
      >
        {loading ? (
          <p className="text-center text-gray-500">Loading bidding state...</p>
        ) : (
          <SongBidding onBidSuccess={fetchBiddingState} />
        )}
      </motion.div>
    </section>
  )
}