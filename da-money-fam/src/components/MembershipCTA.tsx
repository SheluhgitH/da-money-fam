'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { scrollRevealViewport } from '@/lib/motion'
import MagneticButton from './MagneticButton'

export default function MembershipCTA() {
  return (
    <section className="relative py-10 md:py-16 px-4 md:px-8 lg:px-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="max-w-5xl mx-auto glass-gold rounded-3xl border border-gold/30 p-8 md:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.18),transparent_55%)] pointer-events-none" />
        <p className="relative text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-3">
          Inner Circle
        </p>
        <h2 className="relative font-serif text-3xl md:text-5xl text-white mb-4">
          Join DMF Membership
        </h2>
        <p className="relative text-gray-400 max-w-2xl mx-auto text-sm md:text-base mb-8">
          Extended song previews, early drops, exclusive content, and fam-only perks. Level up from free to Fan Club in one tap.
        </p>
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
          <MagneticButton>
            <Link
              href="/account"
              className="inline-block px-8 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
            >
              Join Fan Club
            </Link>
          </MagneticButton>
          <MagneticButton>
            <Link
              href="/#reputation"
              className="inline-block px-8 py-3 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors"
            >
              See Perks
            </Link>
          </MagneticButton>
        </div>
      </motion.div>
    </section>
  )
}
