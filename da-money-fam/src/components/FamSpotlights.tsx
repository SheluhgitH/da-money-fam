'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { scrollRevealViewport } from '@/lib/motion'
import DisplayNameFlair from '@/components/profile/DisplayNameFlair'

type Spotlight = {
  display_name: string
  avatar_url: string | null
  level: number
  active_cosmetics?: string[]
}

export default function FamSpotlights() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])

  useEffect(() => {
    fetch('/api/fans/spotlights')
      .then((r) => r.json())
      .then((data) => setSpotlights(Array.isArray(data.spotlights) ? data.spotlights : []))
      .catch(() => setSpotlights([]))
  }, [])

  if (spotlights.length === 0) return null

  return (
    <section className="max-w-5xl mx-auto mt-10 md:mt-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="text-center mb-6"
      >
        <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-2">Fam Wall</p>
        <h3 className="font-serif text-2xl md:text-3xl text-white">Fam Spotlights</h3>
        <p className="text-zinc-500 text-sm mt-2">Level 2+ fans earning their place in the circle</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {spotlights.map((fan, i) => (
          <motion.div
            key={`${fan.display_name}-${fan.level}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollRevealViewport}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 text-center hover:border-gold/30 transition-colors"
          >
            <div className="relative w-14 h-14 mx-auto mb-3 rounded-full overflow-hidden border-2 border-gold/40 bg-black/40">
              {fan.avatar_url ? (
                <Image src={fan.avatar_url} alt={fan.display_name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gold text-lg font-bold">
                  {fan.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-gold text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded-full">
                L{fan.level}
              </span>
            </div>
            <p className="text-white text-sm font-semibold truncate">
              <DisplayNameFlair
                name={fan.display_name}
                cosmetics={fan.active_cosmetics}
                size="sm"
                nameClassName="text-white text-sm font-semibold"
              />
            </p>
            <p className="text-purple-300 text-[9px] font-bold uppercase tracking-wider mt-1">Fam</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
