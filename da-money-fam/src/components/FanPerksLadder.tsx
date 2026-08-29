'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthProvider'
import {
  FAN_PERK_TIERS,
  FAN_CLUB_PERKS,
  FAN_CLUB_PRICE_MONTHLY,
  xpProgressToNextLevel,
  type PerkStatus,
} from '@/lib/fan-perks'
import { trackFanClubCta } from '@/lib/analytics'

function StatusBadge({ status }: { status: PerkStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-wider border border-green-500/25">
        <span className="w-1 h-1 rounded-full bg-green-400" />
        Live
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-zinc-700/40 text-zinc-400 text-[9px] font-bold uppercase tracking-wider border border-white/10">
      Coming Soon
    </span>
  )
}

export default function FanPerksLadder() {
  const { user } = useAuth()
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let mounted = true
    fetch('/api/user/entitlements')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        if (data.xp != null) {
          setXp(Math.floor(data.xp))
          setLevel(data.level)
        }
        setFanClubActive(Boolean(data.fan_club))
      })
      .catch(() => setFanClubActive(false))
      .finally(() => setLoading(false))

    return () => {
      mounted = false
    }
  }, [user])

  const { currentLevel, nextLevel, xpNeededForNext, progress } = xpProgressToNextLevel(xp)

  return (
    <div className="max-w-5xl mx-auto mt-6 md:mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {FAN_PERK_TIERS.map((tier) => {
          const isCurrent = tier.level === currentLevel
          const isUnlocked = tier.level <= currentLevel
          const isNext = tier.level === nextLevel

          return (
            <motion.div
              key={tier.level}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.4, delay: tier.level * 0.05 }}
              className={[
                'relative rounded-2xl p-4 md:p-5 border backdrop-blur-xl transition-all',
                isCurrent
                  ? 'bg-gold/5 border-gold/40 shadow-[0_0_30px_rgba(212,175,55,0.12)]'
                  : 'bg-zinc-900/40 border-white/10 hover:border-white/20',
              ].join(' ')}
            >
              {isCurrent && (
                <div className="absolute -top-2.5 right-4 px-2.5 py-1 rounded-full bg-gold text-black text-[9px] font-extrabold uppercase tracking-wider">
                  You are here
                </div>
              )}
              <div className="flex items-start gap-4">
                <div
                  className={[
                    'shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-base font-extrabold border-2',
                    isUnlocked
                      ? 'bg-gold/10 border-gold text-gold'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-500',
                  ].join(' ')}
                >
                  L{tier.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className={['font-serif text-base md:text-lg', isUnlocked ? 'text-white' : 'text-zinc-400'].join(' ')}>
                      {tier.title}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {tier.xpRequired.toLocaleString()} XP
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {tier.perks
                      .filter((perk) => perk.status === 'live')
                      .map((perk, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 text-sm">
                        <span className={isUnlocked ? 'text-zinc-300' : 'text-zinc-500'}>{perk.label}</span>
                        <StatusBadge status={perk.status} />
                      </li>
                    ))}
                  </ul>
                  {isNext && user && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                        <span>{xp.toLocaleString()} XP</span>
                        <span>{(tier.xpRequired).toLocaleString()} XP</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress * 100}%` }}
                          className="h-full bg-gradient-to-r from-gold to-gold-light"
                        />
                      </div>
                      <p className="text-[10px] text-gold mt-1 uppercase tracking-wider">
                        {xpNeededForNext.toLocaleString()} XP to Level {nextLevel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className={[
            'md:col-span-2 relative rounded-2xl p-5 md:p-6 border backdrop-blur-xl',
            fanClubActive
              ? 'bg-green-500/5 border-green-500/30'
              : 'bg-purple-500/5 border-purple-400/20',
          ].join(' ')}
        >
          {fanClubActive && (
            <div className="absolute -top-2.5 right-4 px-2.5 py-1 rounded-full bg-green-500 text-black text-[9px] font-extrabold uppercase tracking-wider">
              Active
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div
              className={[
                'shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2',
                fanClubActive ? 'bg-green-500/10 border-green-400' : 'bg-purple-500/10 border-purple-400',
              ].join(' ')}
            >
              {fanClubActive ? '✅' : '👑'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-serif text-lg md:text-xl text-white">Fan Club Membership</h4>
                <span className="text-gold text-sm font-bold">${FAN_CLUB_PRICE_MONTHLY}/mo</span>
              </div>
              <p className="text-zinc-400 text-sm mb-3">
                Skip the grind. Unlock every XP level perk now, plus member-only extras.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FAN_CLUB_PERKS.filter((perk) => perk.status === 'live').map((perk, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-sm">
                    <span className={fanClubActive ? 'text-zinc-200' : 'text-zinc-300'}>{perk.label}</span>
                    <StatusBadge status={perk.status} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0 flex flex-col gap-2 md:items-end">
              {fanClubActive ? (
                <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Membership active</span>
              ) : (
                <Link
                  href="/#membership"
                  onClick={() => {
                    trackFanClubCta('fan_perks_ladder')
                  }}
                  className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-full transition-colors text-center"
                >
                  Join Fan Club
                </Link>
              )}
              {!user && !loading && (
                <Link
                  href="/login?redirect=/%23reputation"
                  className="text-zinc-400 text-xs hover:text-gold transition-colors"
                >
                  Sign in to see your level
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
