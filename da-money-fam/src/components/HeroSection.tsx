'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { scrollToSection } from '../utils/scrollToSection'
import { useState, useEffect } from 'react'

interface TakeoverConfig {
  artistName: string;
  tagline: string;
  videoSrc: string;
  active: boolean;
}

const activeTakeover: TakeoverConfig = {
  artistName: "Vlone Tr3",
  tagline: "Exclusive Takeover Day - Experience the Full Vlone Collection",
  videoSrc: "/videos/background.mp4",
  active: false // Toggle this for takeover
}

export default function HeroSection() {
  const isTakeover = activeTakeover.active;
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={isTakeover ? activeTakeover.videoSrc : "/videos/jackpot-notebook-2.mp4"} type="video/mp4" />
        </video>
        <div className={`absolute inset-0 ${isTakeover ? 'bg-gradient-to-b from-red-900/40 via-black/60 to-matte-black' : 'bg-gradient-to-b from-black/60 via-black/40 to-matte-black'}`} />
      </div>

      {isTakeover && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-600 text-white px-6 py-1 rounded-full text-[10px] font-bold uppercase tracking-[4px] animate-pulse"
          >
            LIVE ARTIST TAKEOVER
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="relative z-10 text-center px-4"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-gold uppercase tracking-[0.5em] text-sm md:text-base mb-4"
        >
          {isTakeover ? `Featuring ${activeTakeover.artistName}` : 'Luxury Hip-Hop Collective'}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className={`font-serif text-5xl md:text-7xl lg:text-9xl font-bold mb-6 ${isTakeover ? 'text-white drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'text-glow'}`}
        >
          {isTakeover ? activeTakeover.artistName : 'DA MONEY FAM'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8"
        >
          {isTakeover ? activeTakeover.tagline : 'Setting trends in music, fashion, and culture since day one'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          <motion.a
            href="https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gold text-matte-black font-bold uppercase tracking-widest text-sm hover:bg-gold-light transition-colors duration-300 neon-border"
          >
            Listen Now
          </motion.a>

          <motion.button
            onClick={() => scrollToSection('services')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 glass text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-colors duration-300 border border-gold/50"
          >
            Learn More
          </motion.button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-gold"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>

      <ClientSideParticles />
    </section>
  )
}

const ClientSideParticles = () => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gold rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </div>
  )
}
