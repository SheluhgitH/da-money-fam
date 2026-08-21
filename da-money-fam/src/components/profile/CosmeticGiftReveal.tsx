'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'
import { useSiteSettings } from '@/contexts/SiteSettingsProvider'

type UnrevealedGift = {
  slug: string
  label: string
  description: string
  gift_message: string | null
}

function CrownBig() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]">
      <path d="M3.5 17.5 2 8l5.5 4L12 4l4.5 8L22 8l-1.5 9.5H3.5Zm1.2 1.5h14.6v1.5H4.7V19Z" />
    </svg>
  )
}

function GlowBig() {
  return (
    <div className="w-16 h-16 rounded-full bg-gold/30 border border-gold/60 shadow-[0_0_40px_rgba(212,175,55,0.7)] flex items-center justify-center">
      <span className="font-serif text-2xl gold-gradient italic">Aa</span>
    </div>
  )
}

function CheckBig() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-16 h-16 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function GiftIcon({ slug }: { slug: string }) {
  if (slug === 'crown_gold') return <CrownBig />
  if (slug === 'name_gold_glow') return <GlowBig />
  return <CheckBig />
}

function ParticleBurst({ animate }: { animate: boolean }) {
  if (!animate) return null
  const particles = Array.from({ length: 12 }, (_, i) => i)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((i) => {
        const angle = (i / particles.length) * Math.PI * 2
        const x = Math.cos(angle) * 90
        const y = Math.sin(angle) * 90
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-gold"
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x, y, scale: 0.2 }}
            transition={{ duration: 1.1, delay: 0.15, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

export default function CosmeticGiftReveal() {
  const { user, loading } = useAuth()
  const { showAnimations } = useSiteSettings()
  const [queue, setQueue] = useState<UnrevealedGift[]>([])
  const [busy, setBusy] = useState(false)

  const current = queue[0] || null

  const loadUnrevealed = useCallback(() => {
    if (!user) {
      setQueue([])
      return
    }
    fetch('/api/user/cosmetics')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.unrevealed) ? data.unrevealed : []
        setQueue(list)
      })
      .catch(() => setQueue([]))
  }, [user])

  useEffect(() => {
    if (loading) return
    loadUnrevealed()
  }, [loading, loadUnrevealed])

  const dismiss = async (enable: boolean) => {
    if (!current || busy) return
    setBusy(true)
    try {
      await fetch('/api/user/cosmetics/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: current.slug, enable }),
      })
      window.dispatchEvent(new Event('dmf-profile-updated'))
      setQueue((prev) => prev.slice(1))
    } catch {
      setQueue((prev) => prev.slice(1))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.slug}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={showAnimations ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={showAnimations ? { opacity: 0 } : undefined}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            className="relative w-full max-w-md glass-gold rounded-2xl p-8 text-center overflow-hidden"
            initial={showAnimations ? { scale: 0.85, y: 24, opacity: 0 } : false}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <ParticleBurst animate={showAnimations} />
            <p className="text-gold text-[10px] font-bold uppercase tracking-[0.35em] mb-4">Gift Unlocked</p>
            <motion.div
              className="flex justify-center mb-5"
              initial={showAnimations ? { scale: 0.4, rotate: -20 } : false}
              animate={{ scale: 1, rotate: current.slug === 'crown_gold' ? -12 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
            >
              <GiftIcon slug={current.slug} />
            </motion.div>
            <h2 className="font-serif text-2xl md:text-3xl text-white mb-2">
              You&apos;ve been gifted {current.label}
            </h2>
            {current.gift_message ? (
              <motion.p
                className="font-serif italic text-xl md:text-2xl gold-gradient tracking-[0.12em] leading-relaxed my-5 px-2"
                initial={showAnimations ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: showAnimations ? 0.45 : 0, duration: 0.7 }}
              >
                &ldquo;{current.gift_message}&rdquo;
              </motion.p>
            ) : (
              <p className="text-zinc-400 text-sm my-4">A gift from Da Money Fam</p>
            )}
            <p className="text-zinc-500 text-xs mb-6">{current.description}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => dismiss(true)}
                className="flex-1 py-3 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
              >
                Enable now
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => dismiss(false)}
                className="flex-1 py-3 rounded-full border border-white/20 text-zinc-300 text-xs font-bold uppercase tracking-wider hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
