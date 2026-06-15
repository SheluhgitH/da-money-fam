'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import BackgroundVideo from './BackgroundVideo'
import { scrollRevealInView } from '@/lib/motion'

export default function PricingVideoSection() {
  const contentRef = useRef(null)
  const isInView = useInView(contentRef, scrollRevealInView)

  return (
    <section className="relative min-h-[70dvh] sm:min-h-[85dvh] md:min-h-[100dvh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <BackgroundVideo src="/videos/background.mp4" />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-matte-black via-transparent to-transparent" />
      </div>

      <motion.div
        ref={contentRef}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
      >
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.5 }}
          className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 gold-gradient"
        >
          Video Editing Packages
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-gray-400 text-sm sm:text-base md:text-lg px-2"
        >
          Professional editing services for your creative vision
        </motion.p>
      </motion.div>
    </section>
  )
}
