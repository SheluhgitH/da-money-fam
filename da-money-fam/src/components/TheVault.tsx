'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'
import { VAULT_DROPS } from '@/data/vault'
import { canAccessPerk } from '@/lib/fan-perks'

export default function TheVault() {
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [level, setLevel] = useState(1)
  const [fanClub, setFanClub] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) {
      setUnlocked(false)
      setLoaded(true)
      return
    }

    fetch('/api/user/entitlements')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const lvl = Number(data.level) || 1
        const club = Boolean(data.fan_club)
        setLevel(lvl)
        setFanClub(club)
        setUnlocked(canAccessPerk(lvl, club, 'exclusive_content'))
      })
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [user])

  return (
    <div id="vault" className="bg-zinc-900/60 border border-gold/20 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-serif text-white uppercase italic">
            The <span className="text-gold">Vault</span>
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">
            Fan Club &amp; Level 5 exclusives
          </p>
        </div>
        <div className="w-10 h-10 border border-gold/50 rounded-full flex items-center justify-center shrink-0">
          <span className="text-gold text-sm">{unlocked ? 'OPEN' : 'LOCK'}</span>
        </div>
      </div>

      {!loaded ? (
        <p className="text-gray-500 text-sm">Loading vault...</p>
      ) : !user ? (
        <div className="text-center py-8 space-y-4">
          <p className="text-gray-400 text-sm">Sign in to unlock member-only drops.</p>
          <Link
            href="/login?redirect=/%23vault"
            className="inline-block px-6 py-2.5 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      ) : !unlocked ? (
        <div className="text-center py-8 space-y-4">
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            You&apos;re Level {level}. Reach Inner Circle (L5) or join Fan Club to open The Vault.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/#reputation"
              className="px-5 py-2.5 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors"
            >
              Earn XP
            </Link>
            {!fanClub && (
              <Link
                href="/#reputation"
                className="px-5 py-2.5 bg-purple-600/40 border border-purple-400/40 text-purple-100 text-xs font-bold uppercase tracking-wider rounded-full hover:bg-purple-600/60 transition-colors"
              >
                Join Fan Club
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {VAULT_DROPS.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative overflow-hidden bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-gold/30 transition-all"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                      {item.type}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-sm tracking-wide uppercase truncate">{item.title}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{item.description}</p>
                </div>
                <a
                  href={item.href}
                  download={item.type === 'photo' ? true : undefined}
                  target={item.type === 'photo' ? '_blank' : undefined}
                  rel={item.type === 'photo' ? 'noopener noreferrer' : undefined}
                  className="shrink-0 bg-gold text-black text-[10px] font-bold px-4 py-2 rounded-full uppercase tracking-tighter hover:bg-white transition-colors"
                >
                  {item.cta}
                </a>
              </div>
            </motion.div>
          ))}
          <p className="text-center text-[10px] text-green-400/80 uppercase tracking-wider pt-2">
            Vault unlocked — Fan Club or Level 5
          </p>
        </div>
      )}
    </div>
  )
}
