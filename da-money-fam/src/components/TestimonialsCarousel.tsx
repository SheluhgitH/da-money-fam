'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { scrollRevealViewport } from '@/lib/motion'

const TESTIMONIALS = [
  {
    quote: 'DMF feels like the future of luxury hip-hop. The drops hit different.',
    name: 'Marcus T.',
    role: 'Fan Club Member',
  },
  {
    quote: 'Bought the sweater and two tracks the same night. Quality is elite.',
    name: 'Aaliyah R.',
    role: 'Collector',
  },
  {
    quote: 'The streams + music store combo keeps me coming back every week.',
    name: 'Jaylen P.',
    role: 'Day-one supporter',
  },
]

export default function TestimonialsCarousel() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(id)
  }, [])

  const item = TESTIMONIALS[index]

  return (
    <section className="max-w-4xl mx-auto text-center">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={scrollRevealViewport}
        className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-3"
      >
        Fam Voices
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="font-serif text-3xl md:text-5xl gold-gradient mb-8"
      >
        What The Culture Says
      </motion.h2>

      <div className="relative min-h-[160px] glass rounded-2xl border border-white/10 p-8 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-white text-lg md:text-xl font-serif leading-relaxed mb-6">
              “{item.quote}”
            </p>
            <p className="text-gold text-sm font-bold uppercase tracking-wider">{item.name}</p>
            <p className="text-gray-500 text-xs mt-1">{item.role}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === index ? 'bg-gold' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
