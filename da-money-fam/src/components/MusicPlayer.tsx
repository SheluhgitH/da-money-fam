'use client'

import { useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const tracks = [
  { id: 2, title: 'NoteBook', artist: 'JackPot', src: '/audio/notebook audio for site.m4a', duration: '0:36' },
  { id: 3, title: 'Take Your Time Ft JackPot', artist: 'JackPot & Vlone Tr3', src: '/audio/Take Your Time Ft JackPot.m4a', duration: '0:26' },
  { id: 1, title: 'Fool in Here Ft JackPot', artist: 'Vlone Tr3', src: '/audio/wok audio - Made with Clipchamp.m4a', duration: '0:33' },
]

export default function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState(tracks[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.75)

  const audioRef = useRef<HTMLAudioElement>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.loop = true

      const updateProgress = () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100)
        }
      }

      audio.addEventListener('timeupdate', updateProgress)
      audio.addEventListener('ended', () => setIsPlaying(false))
      audio.addEventListener('error', () => alert('Audio file unavailable.'))

      return () => {
        audio.removeEventListener('timeupdate', updateProgress)
        audio.removeEventListener('ended', () => setIsPlaying(false))
        audio.removeEventListener('error', () => alert('Audio file unavailable.'))
      }
    }
  }, [currentTrack, volume])

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

  const togglePlay = () => {
    const audio = audioRef.current
    if (audio) {
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const nextTrack = () => {
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id)
    const nextIndex = (currentIndex + 1) % tracks.length
    setCurrentTrack(tracks[nextIndex])
    setProgress(0)
  }

  const prevTrack = () => {
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id)
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1
    setCurrentTrack(tracks[prevIndex])
    setProgress(0)
  }

  return (
    <section id="music" ref={ref} className="max-w-7xl mx-auto">
      <audio ref={audioRef} src={currentTrack.src} preload="metadata" />
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
          Latest Releases
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-lg"
        >
          Experience the sound of luxury
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
            <div className="w-64 h-64 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border">
              <svg className="w-24 h-24 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="font-serif text-3xl font-bold mb-2">{currentTrack.title}</h3>
              <p className="text-gold text-lg mb-4">{currentTrack.artist}</p>
              
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
                <button onClick={prevTrack} className="text-white hover:text-gold transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

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

                <button onClick={nextTrack} className="text-white hover:text-gold transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {tracks.map((track, index) => (
          <motion.div
            key={track.id}
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              setCurrentTrack(track)
              setProgress(0)
              if (isPlaying && audioRef.current) {
                audioRef.current.load()
                audioRef.current.play()
              }
            }}
            className={`glass rounded-xl p-6 cursor-pointer transition-all duration-300 ${
              currentTrack.id === track.id ? 'border-gold neon-border' : 'border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h4 className="font-serif text-lg font-bold">{track.title}</h4>
                <p className="text-gold text-sm">{track.artist}</p>
                <p className="text-gray-500 text-xs">{track.duration}</p>
              </div>

              {currentTrack.id === track.id && isPlaying && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-gold"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
