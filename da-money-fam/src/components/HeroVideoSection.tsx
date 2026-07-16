'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import BackgroundVideo from './BackgroundVideo'
import Modal from './Modal'
import ContactForm from './ContactForm'
import { scrollRevealInView } from '@/lib/motion'
import ShowreelModal from './ShowreelModal'

export default function HeroVideoSection() {
  const [isShowreelOpen, setIsShowreelOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const contentRef = useRef(null)
  const isInView = useInView(contentRef, scrollRevealInView)

  const playShowreel = () => {
    setIsShowreelOpen(true)
  }

  return (
    <section
      id="services"
      className="relative min-h-[85dvh] sm:min-h-[100dvh] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <BackgroundVideo src="/videos/hero-video.mp4" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-matte-black via-transparent to-matte-black" />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          }}
        />
      </div>

      <motion.div
        ref={contentRef}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center px-4 max-w-5xl mx-auto w-full"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-gold rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 lg:p-12 mb-6 sm:mb-8 neon-border"
        >
          <motion.h2
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="font-serif text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 gold-gradient"
          >
            PREMIUM ANIMATION SERVICES
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-300 text-sm sm:text-base md:text-lg mb-2 sm:mb-4"
          >
            Creating cinematic animations for commercials, music videos, and brand campaigns
          </motion.p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row gap-4 sm:gap-4 justify-center items-stretch sm:items-center"
        >
          <button
            type="button"
            onClick={playShowreel}
            className="relative z-0 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gold text-matte-black font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-gold-light transition-colors duration-300 flex items-center justify-center gap-2 neon-border active:scale-[0.98] sm:hover:scale-105 sm:transition-transform"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Showreel
          </button>

          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="relative z-10 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-black/70 backdrop-blur-md text-white font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-black/85 transition-colors duration-300 border border-gold/50 neon-border active:scale-[0.98] sm:hover:scale-105 sm:transition-transform"
          >
            Start Your Animation Project
          </button>
        </motion.div>
      </motion.div>

      <Modal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} title="Start Your Animation Project">
        <ContactForm onClose={() => setIsContactOpen(false)} />
      </Modal>

      <ShowreelModal isOpen={isShowreelOpen} onClose={() => setIsShowreelOpen(false)} videoSrc="/videos/hero-video.mp4" />

    </section>
  )
}
