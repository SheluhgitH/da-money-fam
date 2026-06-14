'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useSiteSettings } from '@/contexts/SiteSettingsProvider'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'


const FALLING_OBJECTS = [
  {
    id: 'coin',
    src: '/animation_assets/dmf_coin.png',
    alt: 'DMF Coin',
    size: 50,
    amount: 5,
    duration: [10, 15],
    delay: [0, 5],
    clickable: false,
    value: 0,
  },
  {
    id: 'notebook',
    src: '/animation_assets/notebook.png',
    alt: 'Notebook',
    size: 80,
    amount: 3,
    duration: [12, 18],
    delay: [2, 7],
    clickable: false,
    value: 0,
  },
]

export default function FallingObjects() {
  const { showAnimations } = useSiteSettings()
  const { user } = useAuth()
  if (!showAnimations) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {FALLING_OBJECTS.map((objectType) =>
        Array.from({ length: objectType.amount * 2 }).map((_, i) => (
          <motion.div
            key={`${objectType.id}-${i}`}
            initial={{
              y: -100,
              x: Math.random() * window.innerWidth,
              opacity: 0,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, window.innerHeight + objectType.size],
              x: [null, Math.random() * window.innerWidth],
              opacity: [0, 1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: Math.random() * (objectType.duration[1] - objectType.duration[0]) + objectType.duration[0],
              delay: Math.random() * (objectType.delay[1] - objectType.delay[0]) + objectType.delay[0],
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute"
            style={{
              width: objectType.size,
              height: objectType.size,
              pointerEvents: objectType.clickable ? 'auto' : 'none', // Make clickable only for notebooks
            }}
            onClick={objectType.clickable ? (e) => handleCoinCollect(`${objectType.id}-${i}`, objectType.value, e.clientX, e.clientY) : undefined}
          >
            <Image src={objectType.src} alt={objectType.alt} layout="fill" objectFit="contain" />
          </motion.div>
        ))
      )}

    </div>
  )
}
