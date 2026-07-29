'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { useAuth } from '@/contexts/AuthProvider'
import { NEWSLETTER_WALLPAPERS, VAULT_WALLPAPERS } from '@/data/wallpapers'
import { canAccessPerk } from '@/lib/fan-perks'

function WallpapersContent() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const pack = searchParams.get('pack')
  const isVault = pack === 'vault'
  const [unlocked, setUnlocked] = useState(!isVault)
  const [checking, setChecking] = useState(isVault)

  useEffect(() => {
    if (!isVault) {
      setUnlocked(true)
      setChecking(false)
      return
    }
    if (!user) {
      setUnlocked(false)
      setChecking(false)
      return
    }
    fetch('/api/user/entitlements')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setUnlocked(false)
          return
        }
        setUnlocked(canAccessPerk(Number(data.level) || 1, Boolean(data.fan_club), 'exclusive_content'))
      })
      .catch(() => setUnlocked(false))
      .finally(() => setChecking(false))
  }, [isVault, user])

  const items = useMemo(() => (isVault ? VAULT_WALLPAPERS : NEWSLETTER_WALLPAPERS), [isVault])

  if (checking) {
    return <div className="text-center text-gray-500 py-20">Checking access...</div>
  }

  if (isVault && !unlocked) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase">Vault Pack</p>
        <h1 className="font-serif text-3xl text-white">Members only</h1>
        <p className="text-gray-400 text-sm">
          Reach Level 5 or join Fan Club to download exclusive BTS wallpapers.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          {!user ? (
            <Link
              href="/login?redirect=/wallpapers?pack=vault"
              className="px-6 py-3 bg-gold text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <Link
              href="/#reputation"
              className="px-6 py-3 bg-gold text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
            >
              Unlock Access
            </Link>
          )}
          <Link
            href="/wallpapers"
            className="px-6 py-3 border border-gold/40 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            Free Pack
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-2">
          {isVault ? 'Vault Pack' : 'Welcome Pack'}
        </p>
        <h1 className="font-serif text-3xl md:text-5xl text-white mb-3">
          {isVault ? 'Exclusive BTS Wallpapers' : 'DMF Wallpaper Pack'}
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
          {isVault
            ? 'Member-only stills from The Vault. Save to your device and set as wallpaper.'
            : 'Thanks for joining the list. Download these stills and set them as your lock screen.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {items.map((wall) => (
          <div key={wall.id} className="group">
            <div className="aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-black/40 mb-3">
              <img
                src={wall.src}
                alt={wall.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-white text-sm font-semibold truncate">{wall.title}</p>
              <a
                href={wall.src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-wider text-gold font-bold hover:text-white transition-colors shrink-0"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Link
          href="/#store"
          className="px-6 py-3 bg-gold text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
        >
          Shop Music
        </Link>
        <Link
          href="/#vault"
          className="px-6 py-3 border border-gold/40 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
        >
          Open The Vault
        </Link>
      </div>
    </div>
  )
}

export default function WallpapersPage() {
  return (
    <main className="min-h-screen bg-matte-black">
      <Navigation />
      <section className="pt-28 md:pt-32 pb-16 px-4 md:px-8">
        <Suspense fallback={<div className="text-center text-gray-500 py-20">Loading wallpapers...</div>}>
          <WallpapersContent />
        </Suspense>
      </section>
      <Footer />
    </main>
  )
}
