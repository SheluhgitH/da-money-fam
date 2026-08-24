'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSiteSettings } from '@/contexts/SiteSettingsProvider'

const FALLING_OBJECTS = [
  {
    id: 'coin',
    src: '/animation_assets/dmf_coin.png',
    alt: 'DMF Coin',
    size: 50,
    amount: 5,
    duration: [10, 15],
    delay: [0, 5],
  },
  {
    id: 'notebook',
    src: '/animation_assets/notebook.png',
    alt: 'Notebook',
    size: 80,
    amount: 3,
    duration: [12, 18],
    delay: [2, 7],
  },
]

export default function FallingObjects() {
  const { showAnimations } = useSiteSettings()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !showAnimations) return null
  if (pathname?.startsWith('/ad-studio')) return null

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const isMobile = viewportWidth < 640
  const sizeScale = isMobile ? 0.55 : 1
  const countScale = isMobile ? 0.5 : 1

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {FALLING_OBJECTS.map((objectType) =>
        Array.from({ length: Math.max(1, Math.round(objectType.amount * 2 * countScale)) }).map((_, i) => (
          <motion.div
            key={`${objectType.id}-${i}`}
            initial={{
              y: -100,
              x: Math.random() * viewportWidth,
              opacity: 0,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, viewportHeight + objectType.size * sizeScale],
              x: [null, Math.random() * viewportWidth],
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
              width: objectType.size * sizeScale,
              height: objectType.size * sizeScale,
            }}
          >
            <Image src={objectType.src} alt={objectType.alt} fill className="object-contain" sizes={`${Math.round(objectType.size * sizeScale)}px`} />
          </motion.div>
        ))
      )}
    </div>
  )
}
