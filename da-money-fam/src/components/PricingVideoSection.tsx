'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function PricingVideoSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/jackpot-notebook-2.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-matte-black via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
      >
        <motion.h2
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-serif text-4xl md:text-6xl font-bold mb-4 gold-gradient"
        >
          Video Editing Packages
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-gray-400 text-lg"
        >
          Professional editing services for your creative vision
        </motion.p>
      </motion.div>
    </section>
  )
}