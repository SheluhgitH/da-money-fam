'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { scrollRevealViewport } from '@/lib/motion'
import { asAboutSettings } from '@/lib/site-settings'

const HIGHLIGHTS = [
  {
    title: 'Music & Culture',
    body: 'Original drops, live streams, and visuals from artists building the next wave of hip-hop.',
  },
  {
    title: 'Creative Services',
    body: 'Video editing, animation, and branding for artists and brands who want a luxury look.',
  },
  {
    title: 'Community First',
    body: 'We invest back into the fam — supporting local talent, events, and opportunities that uplift our people.',
  },
] as const

export default function AboutFamSection() {
  const [imageUrl, setImageUrl] = useState('/images/collective/collective-14.jpg')

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setImageUrl(asAboutSettings(data.settings?.['homepage.about']).imageUrl))
      .catch(() => {})
  }, [])

  return (
    <section id="about" className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={scrollRevealViewport}
          transition={{ duration: 0.6 }}
          className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5] overflow-hidden rounded-2xl border border-gold/30 shadow-2xl shadow-gold/10"
        >
          {imageUrl.startsWith('http') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Da Money Fam Collective" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image
              src={imageUrl}
              alt="Da Money Fam Collective"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-2">
              Built Different
            </p>
            <p className="font-serif text-2xl md:text-3xl text-white">
              More than music — a movement.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={scrollRevealViewport}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6 md:space-y-8"
        >
          <div>
            <p className="text-gold text-[10px] sm:text-xs font-bold tracking-[5px] uppercase mb-3">
              Who We Are
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold gold-gradient mb-4">
              Da Money Fam
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Da Money Fam is a luxury hip-hop collective built around real artists, real stories, and
              real community. We release music, drop merch, stream life behind the scenes, and create
              visuals that set the tone for the culture.
            </p>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mt-4">
              Our mission is simple: elevate the people around us. We want to give artists a platform,
              give fans a home, and use what we build to better the community — through events,
              creative opportunities, and showing the next generation what&apos;s possible when you
              move with purpose.
            </p>
          </div>

          <div className="space-y-4">
            {HIGHLIGHTS.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={scrollRevealViewport}
                transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                className="glass rounded-xl border border-white/10 p-4 md:p-5"
              >
                <h3 className="text-white font-semibold text-sm md:text-base mb-1">{item.title}</h3>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
