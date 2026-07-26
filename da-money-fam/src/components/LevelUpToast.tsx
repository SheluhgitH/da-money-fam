'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

type LevelUpToastProps = {
  level: number
  perks: string[]
  onClose: () => void
}

export default function LevelUpToast({ level, perks, onClose }: LevelUpToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[min(92vw,380px)] glass-gold border border-gold/40 rounded-2xl p-5 shadow-2xl"
      role="status"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-3 text-zinc-500 hover:text-white text-sm"
        aria-label="Dismiss"
      >
        ×
      </button>
      <p className="text-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Level Up</p>
      <h3 className="font-serif text-2xl text-white mb-2">You reached Level {level}</h3>
      {perks.length > 0 ? (
        <ul className="space-y-1">
          {perks.map((perk) => (
            <li key={perk} className="text-sm text-zinc-300 flex items-start gap-2">
              <span className="text-gold mt-0.5">✦</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-400">Keep grinding — more perks unlock at higher levels.</p>
      )}
    </motion.div>
  )
}
