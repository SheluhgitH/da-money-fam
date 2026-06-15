'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { scrollToSection } from '@/utils/scrollToSection'
import { scrollRevealInView } from '@/lib/motion'

const pricingPackages = [
  {
    id: 1,
    title: 'Video Commercials',
    price: '$500 / video',
    description: 'Punchy, high-impact cuts designed to convert viewers into customers. Includes color grading and sound mixing.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l2 2-2 2" />
      </svg>
    ),
  },
  {
    id: 2,
    title: 'Short Films',
    price: '$1,200 / project',
    description: 'Cinematic storytelling focus. We handle pacing, narrative flow, and advanced color correction to set the mood.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-3m-9 0v12a2 2 0 002 2h6a2 2 0 002-2V4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 3,
    title: 'YouTube Content',
    price: '$300 / video',
    description: 'Clean, engaging edits for long-form content. Includes basic motion graphics, cuts, and audio cleanup.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l.707.707A1 1 0 0012.414 11H15m-3 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 4,
    title: 'Social Reels',
    price: '$150 / reel',
    description: 'Fast-paced, trend-aware editing for vertical formats (TikTok/IG). Perfect for keeping retention high.',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 3-5 3V10z" />
      </svg>
    ),
  },
]

export default function VideoEditingSection() {
  const headerRef = useRef(null)
  const isInView = useInView(headerRef, scrollRevealInView)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <section id="video-editing" className="max-w-7xl mx-auto py-10 md:py-16 lg:py-20">
      <div className="px-4 md:px-8 lg:px-16">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 md:mb-12 lg:mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 gold-gradient"
          >
            Video Editing Services
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 text-sm sm:text-base md:text-lg"
          >
            Professional post-production tailored to your vision.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8"
        >
          {pricingPackages.map((pkg) => (
            <motion.div
              key={pkg.id}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className="glass rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-500 hover:border-gold/50 hover:neon-border"
            >
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border text-black shrink-0">
                  {pkg.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold mb-1">
                    {pkg.title}
                  </h3>
                  <p className="text-gold font-bold text-base sm:text-lg md:text-xl">
                    {pkg.price}
                  </p>
                </div>
              </div>

              <p className="text-gray-400 leading-relaxed mb-6">
                {pkg.description}
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => scrollToSection('services')}
                className="px-5 py-2 bg-gold text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white transition-colors"
              >
                Book Now
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}