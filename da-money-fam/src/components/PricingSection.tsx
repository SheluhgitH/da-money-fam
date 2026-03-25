'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const pricingPackages = [
  {
    id: 1,
    title: 'Commercial Editing',
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
    title: 'Short Film Editing',
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
    title: 'YouTube Packages',
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
    title: 'Social Media Reels',
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

export default function PricingSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

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
    <section id="pricing" className="max-w-7xl mx-auto py-20">
      <div className="px-4 md:px-8 lg:px-16">
        <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {pricingPackages.map((pkg) => (
          <motion.div
            key={pkg.id}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="glass rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:neon-border"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border text-black">
                {pkg.icon}
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold mb-1">
                  {pkg.title}
                </h3>
                <p className="text-gold font-bold text-xl">
                  {pkg.price}
                </p>
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed">
              {pkg.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
      </div>
    </section>
  )
}