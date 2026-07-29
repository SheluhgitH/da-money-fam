'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthProvider'
import { XP_PER_LEVEL, getTierForLevel } from '@/lib/fan-perks'
import LevelUpToast from '@/components/LevelUpToast'
import { AnimatePresence } from 'framer-motion'

type Variant = 'card' | 'nav' | 'compact'

type DailyCheckInPromptProps = {
  variant?: Variant
  className?: string
}

export default function DailyCheckInPrompt({ variant = 'card', className = '' }: DailyCheckInPromptProps) {
  const { user } = useAuth()
  const [xp, setXp] = useState(0)
  const [level, setLevel] = useState(1)
  const [streak, setStreak] = useState(0)
  const [isLoggedInToday, setIsLoggedInToday] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [levelUpToast, setLevelUpToast] = useState<{ level: number; perks: string[] } | null>(null)

  const applyStats = (sXp: number, sLevel: number, sStreak: number, lastLogin: string | null) => {
    setXp(sXp)
    setLevel(sLevel)
    setStreak(sStreak)
    setIsLoggedInToday(lastLogin === new Date().toDateString())
  }

  useEffect(() => {
    if (!user) {
      setLoaded(false)
      return
    }

    fetch('/api/user/entitlements')
      .then((r) => r.json())
      .then((data) => {
        if (data.xp != null) {
          applyStats(data.xp, data.level, data.streak, data.last_login)
        }
      })
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [user])

  const handleDailyCheckIn = async () => {
    if (!user || isLoggedInToday || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await fetch('/api/user/check-in', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Check-in failed')

      if (data.stats) {
        applyStats(data.stats.xp, data.stats.level, data.stats.streak, data.stats.last_login)
      }

      if (data.leveledUp && data.stats) {
        const tier = getTierForLevel(data.stats.level)
        setLevelUpToast({
          level: data.stats.level,
          perks: (tier?.perks || []).map((p) => p.label),
        })
      }

      window.dispatchEvent(new Event('dmf-checkin-updated'))
    } catch (err) {
      console.error(err)
    } finally {
      setCheckingIn(false)
    }
  }

  if (!user) {
    if (variant === 'nav') return null
    return (
      <div className={`rounded-2xl border border-gold/20 bg-zinc-900/40 p-5 text-center ${className}`}>
        <p className="text-gold text-[10px] font-bold tracking-[0.3em] uppercase mb-2">Daily Check-In</p>
        <p className="text-gray-400 text-sm mb-4">Sign in to claim XP and keep your streak alive.</p>
        <Link
          href="/login?redirect=/account/profile"
          className="inline-block px-5 py-2.5 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (!loaded) {
    if (variant === 'nav') return null
    return (
      <div className={`rounded-2xl border border-white/5 bg-black/30 p-5 text-gray-500 text-sm ${className}`}>
        Loading check-in...
      </div>
    )
  }

  if (variant === 'nav') {
    if (isLoggedInToday) {
      return (
        <Link
          href="/account/profile"
          className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-gold hover:border-gold/30 transition-colors"
          title={`${streak}-day streak`}
        >
          L{level} · {streak}d
        </Link>
      )
    }

    return (
      <button
        type="button"
        onClick={handleDailyCheckIn}
        disabled={checkingIn}
        className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-60"
      >
        {checkingIn ? '...' : 'Check In'}
      </button>
    )
  }

  const xpPct = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100

  return (
    <>
      <div
        className={`rounded-2xl border border-gold/20 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-6 ${className}`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-gold text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Daily Check-In</p>
            <h3 className="font-serif text-xl text-white">
              {isLoggedInToday ? `Day ${streak} streak` : 'Claim today’s XP'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              Level {level} · {Math.floor(xp)} XP
            </p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-gold flex items-center justify-center text-sm font-extrabold text-gold shrink-0">
            L{level}
          </div>
        </div>

        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5 mb-4">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>

        <button
          type="button"
          onClick={handleDailyCheckIn}
          disabled={isLoggedInToday || checkingIn}
          className={`w-full py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
            isLoggedInToday
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gold text-black hover:bg-white'
          }`}
        >
          {checkingIn
            ? 'Claiming...'
            : isLoggedInToday
              ? `Checked in · ${streak}-day streak`
              : 'Claim Daily Check-In'}
        </button>

        {variant === 'compact' && (
          <Link
            href="/#reputation"
            className="mt-3 block text-center text-gold text-[10px] uppercase tracking-wider hover:underline"
          >
            View all fan perks
          </Link>
        )}
      </div>

      <AnimatePresence>
        {levelUpToast && (
          <LevelUpToast
            level={levelUpToast.level}
            perks={levelUpToast.perks}
            onClose={() => setLevelUpToast(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
