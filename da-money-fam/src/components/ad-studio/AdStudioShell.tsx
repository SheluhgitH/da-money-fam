'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdStudio } from '@/hooks/useAdStudio'
import GenerationLibrary from './GenerationLibrary'
import PreviewCanvas from './PreviewCanvas'
import PromptDock from './PromptDock'
import { COIN_PACKAGES, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'

export default function AdStudioShell({
  initialBrief = '',
  checkoutStatus = null,
}: {
  initialBrief?: string
  checkoutStatus?: string | null
}) {
  const studio = useAdStudio(initialBrief)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (checkoutStatus !== 'success') return
    let cancelled = false
    ;(async () => {
      await studio.fetchPricing()
      if (!cancelled) {
        setToast('Coinz updated')
        window.setTimeout(() => setToast(null), 4000)
        const url = new URL(window.location.href)
        url.searchParams.delete('status')
        window.history.replaceState({}, '', url.pathname + url.search)
      }
    })()
    return () => {
      cancelled = true
    }
    // Only run when returning from Stripe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus])

  const buyPack = async (packageId: string) => {
    setBuyingId(packageId)
    try {
      const res = await fetch('/api/coinz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId, return_path: '/ad-studio' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Coin purchase failed')
      window.location.href = data.url
    } catch (err) {
      studio.setError(err instanceof Error ? err.message : 'Coin purchase failed')
      setBuyingId(null)
      setBuyOpen(false)
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#050505] text-white overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.08),_transparent_50%)]" />
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-gold/15 bg-black/70 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-gold font-serif text-sm tracking-[0.15em] uppercase shrink-0">
            DMF
          </Link>
          <span className="text-white/20">/</span>
          <h1 className="text-sm font-serif text-gold truncate">Ad Studio</h1>
          {studio.statusText && (
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-gold/60 border border-gold/20 px-2 py-1 rounded-full truncate animate-pulse">
              {studio.statusText}
            </span>
          )}
          {toast && (
            <span className="text-[10px] uppercase tracking-widest text-black bg-gold px-2 py-1 rounded-full">
              {toast}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="md:hidden text-[10px] uppercase tracking-widest px-2 py-1 border border-gold/25 text-gold rounded-full"
          >
            Library
          </button>
          {studio.pricing?.isAuthenticated && (
            <>
              <span className="text-[10px] font-mono text-gold/80 border border-gold/20 px-2 py-1 rounded-md">
                {studio.pricing.balance} Coinz
              </span>
              <button
                type="button"
                onClick={() => setBuyOpen((o) => !o)}
                className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-gold text-black font-bold hover:bg-white transition-colors"
              >
                Buy Coinz
              </button>
            </>
          )}
          <Link href="/account" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-gold">
            Account
          </Link>
        </div>
      </header>

      {buyOpen && studio.pricing?.isAuthenticated && (
        <div className="shrink-0 border-b border-gold/15 bg-black/80 px-4 py-3 flex flex-wrap gap-2">
          {packs.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              disabled={buyingId !== null}
              onClick={() => buyPack(pkg.id)}
              className="px-3 py-2 rounded-lg border border-gold/30 text-left hover:bg-gold hover:text-black transition-colors disabled:opacity-50"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider">
                {buyingId === pkg.id ? 'Redirecting…' : `≈ ${pkg.liteAds} Lite · ${pkg.fastAds} Fast`}
              </span>
              <span className="block text-[9px] opacity-70">
                {pkg.amount} Coinz · ${pkg.price}
              </span>
            </button>
          ))}
          <p className="w-full text-[10px] text-white/35">
            Lite is cheaper and faster drafts. Fast is higher quality, more Coinz.
          </p>
          <button
            type="button"
            onClick={() => setBuyOpen(false)}
            className="text-[10px] text-white/40 uppercase tracking-widest px-2"
          >
            Close
          </button>
        </div>
      )}

      {!studio.pricing?.isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-white/60 text-sm">Sign in to generate ads with Coinz.</p>
          <Link
            href="/login?redirect=/ad-studio"
            className="bg-gold text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 relative z-10">
          <aside className="hidden md:flex w-64 lg:w-72 border-r border-gold/15 flex-col bg-black/50 backdrop-blur-sm">
            <GenerationLibrary studio={studio} />
          </aside>

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <PreviewCanvas studio={studio} />
            <div className="shrink-0 border-t border-gold/20 bg-black/80 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
              <PromptDock studio={studio} />
            </div>
          </div>
        </div>
      )}

      {libraryOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setLibraryOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-[80%] max-w-xs bg-matte-black border-r border-gold/20"
            onClick={(e) => e.stopPropagation()}
          >
            <GenerationLibrary studio={studio} onCloseMobile={() => setLibraryOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
