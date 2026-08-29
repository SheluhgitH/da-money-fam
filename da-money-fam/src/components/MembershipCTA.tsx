'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { scrollRevealViewport } from '@/lib/motion'
import MagneticButton from './MagneticButton'
import { useAuth } from '@/contexts/AuthProvider'
import { FAN_CLUB_PRICE_MONTHLY } from '@/lib/fan-perks'
import { trackFanClubCta } from '@/lib/analytics'

export default function MembershipCTA() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startCheckout = async () => {
    trackFanClubCta('membership_cta')
    if (!user) {
      window.location.href = '/login?redirect=/account'
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/subscribe', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
      else throw new Error('No checkout URL')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

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
          Extended song previews, early drops, exclusive content, and fam-only perks. Level up from
          free to Fan Club for ${FAN_CLUB_PRICE_MONTHLY}/mo.
        </p>
        {error && <p className="relative text-red-300 text-xs mb-4">{error}</p>}
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center">
          <MagneticButton>
            <button
              type="button"
              disabled={loading}
              onClick={() => void startCheckout()}
              className="inline-block px-8 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Redirecting…' : `Join Fan Club · $${FAN_CLUB_PRICE_MONTHLY}/mo`}
            </button>
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
