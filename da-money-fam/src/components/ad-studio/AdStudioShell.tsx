'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useAdStudio } from '@/hooks/useAdStudio'
import { useImageStudio } from '@/hooks/useImageStudio'
import GenerationLibrary from './GenerationLibrary'
import PreviewCanvas from './PreviewCanvas'
import PromptDock from './PromptDock'
import ImageStudioPanel from './ImageStudioPanel'
import ImageLibrary from './ImageLibrary'
import GtaStylePanel from './GtaStylePanel'
import { COIN_PACKAGES, packAdCopy, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'

export default function AdStudioShell({
  initialBrief = '',
  checkoutStatus = null,
  initialTab = 'video',
  initialImageMode = 'stills',
}: {
  initialBrief?: string
  checkoutStatus?: string | null
  initialTab?: 'video' | 'images'
  initialImageMode?: 'stills' | 'gta'
}) {
  const studio = useAdStudio(initialBrief)
  const images = useImageStudio()
  const [studioTab, setStudioTab] = useState<'video' | 'images'>(initialTab)
  const [imageMode, setImageMode] = useState<'stills' | 'gta'>(initialImageMode)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showImageTip, setShowImageTip] = useState(false)
  const [showGtaTip, setShowGtaTip] = useState(false)

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem('dmf-gta-style-tip') === '1') {
        if (sessionStorage.getItem('dmf-image-studio-tip') !== '1') {
          setShowImageTip(true)
        }
        return
      }
      setShowGtaTip(true)
    } catch {
      setShowGtaTip(true)
    }
  }, [])

  useEffect(() => {
    if (checkoutStatus !== 'success') return
    let cancelled = false
    ;(async () => {
      await studio.fetchPricing()
      await images.fetchQuote()
      await images.fetchGtaQuotes()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutStatus])

  const dismissImageTip = () => {
    setShowImageTip(false)
    try {
      sessionStorage.setItem('dmf-image-studio-tip', '1')
    } catch {
      /* ignore */
    }
  }

  const dismissGtaTip = () => {
    setShowGtaTip(false)
    try {
      sessionStorage.setItem('dmf-gta-style-tip', '1')
    } catch {
      /* ignore */
    }
  }

  const openGtaMode = () => {
    setStudioTab('images')
    setImageMode('gta')
    dismissGtaTip()
    dismissImageTip()
  }

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

  const applyImageForVideo = (url: string) => {
    studio.addReferenceFromUrl(url, true)
    setStudioTab('video')
    setToast('Image added as video reference')
    window.setTimeout(() => setToast(null), 3000)
  }

  const balance =
    studioTab === 'images'
      ? images.gtaQuotes[images.gtaQuality]?.balance ?? images.quote?.balance
      : studio.pricing?.balance

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
          <div className="flex gap-1 ml-1">
            <button
              type="button"
              onClick={() => setStudioTab('video')}
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                studioTab === 'video'
                  ? 'bg-gold text-black border-gold'
                  : 'border-gold/25 text-gold/70'
              }`}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => {
                setStudioTab('images')
                dismissImageTip()
              }}
              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                studioTab === 'images'
                  ? 'bg-gold text-black border-gold'
                  : 'border-gold/25 text-gold/70'
              }`}
            >
              Image Studio
            </button>
          </div>
          {studioTab === 'video' && studio.statusText && (
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
          {(studio.pricing?.isAuthenticated || images.quote || images.gtaQuotes.fast) && (
            <>
              <span className="text-[10px] font-mono text-gold/80 border border-gold/20 px-2 py-1 rounded-md">
                {balance ?? '—'} Coinz
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

      {showImageTip && !showGtaTip && studioTab === 'video' && (
        <div className="shrink-0 border-b border-gold/20 bg-gold/10 px-4 py-2 flex items-center justify-between gap-3 relative z-10">
          <p className="text-[11px] text-gold">
            New: generate ad stills in <span className="font-bold">Image Studio</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStudioTab('images')
                dismissImageTip()
              }}
              className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold text-black font-bold"
            >
              Open
            </button>
            <button
              type="button"
              onClick={dismissImageTip}
              className="text-[10px] uppercase tracking-wider text-gold/60 hover:text-gold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {buyOpen && (
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
                {buyingId === pkg.id ? 'Redirecting…' : packAdCopy(pkg)}
              </span>
              <span className="block text-[9px] opacity-70">
                {pkg.amount} Coinz · ${pkg.price}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setBuyOpen(false)}
            className="text-[10px] text-white/40 uppercase tracking-widest px-2"
          >
            Close
          </button>
        </div>
      )}

      {!studio.pricing?.isAuthenticated && studioTab === 'video' ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-white/60 text-sm">Sign in to generate ads with Coinz.</p>
          <Link
            href="/login?redirect=/ad-studio"
            className="bg-gold text-black px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            Sign in
          </Link>
        </div>
      ) : studioTab === 'images' ? (
        <div className="flex-1 flex min-h-0 relative z-10">
          <aside className="hidden md:flex w-64 lg:w-72 border-r border-gold/15 flex-col bg-black/50 backdrop-blur-sm">
            <p className="px-3 pt-3 text-[10px] uppercase tracking-widest text-gold/50">Images</p>
            <ImageLibrary
              items={images.library}
              onSelect={(url) => images.setPreviewUrl(url)}
              onEdit={(url) => images.useImageAsEdit(url)}
              onUseForVideo={applyImageForVideo}
            />
          </aside>
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="shrink-0 flex gap-1 px-4 pt-3 pb-1">
              <button
                type="button"
                onClick={() => setImageMode('stills')}
                className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                  imageMode === 'stills'
                    ? 'bg-gold text-black border-gold'
                    : 'border-gold/25 text-gold/70'
                }`}
              >
                Ad Stills
              </button>
              <button
                type="button"
                onClick={() => setImageMode('gta')}
                className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                  imageMode === 'gta'
                    ? 'bg-gold text-black border-gold'
                    : 'border-gold/25 text-gold/70'
                }`}
              >
                GTA Styles
              </button>
            </div>
            {imageMode === 'gta' ? (
              <GtaStylePanel images={images} onUseForVideo={applyImageForVideo} />
            ) : (
              <ImageStudioPanel images={images} onUseForVideo={applyImageForVideo} />
            )}
          </div>
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
            {studioTab === 'images' ? (
              <ImageLibrary
                items={images.library}
                onSelect={(url) => {
                  images.setPreviewUrl(url)
                  setLibraryOpen(false)
                }}
                onEdit={(url) => {
                  images.useImageAsEdit(url)
                  setLibraryOpen(false)
                }}
                onUseForVideo={(url) => {
                  applyImageForVideo(url)
                  setLibraryOpen(false)
                }}
              />
            ) : (
              <GenerationLibrary studio={studio} onCloseMobile={() => setLibraryOpen(false)} />
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showGtaTip && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={dismissGtaTip}
            />
            <motion.div
              role="dialog"
              aria-labelledby="gta-tip-title"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-sm rounded-2xl border border-gold/30 bg-[#0c0c0c] p-6 shadow-[0_0_60px_rgba(255,215,0,0.12)]"
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
                style={{
                  background:
                    'radial-gradient(ellipse at top, rgba(255,45,149,0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(0,229,192,0.12), transparent 50%)',
                }}
              />
              <div className="relative">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold/60 mb-2">New mode</p>
                <h2 id="gta-tip-title" className="font-serif text-2xl text-gold mb-2">
                  GTA Style Mode
                </h2>
                <p className="text-sm text-white/55 leading-relaxed mb-5">
                  Turn any photo into every Rockstar era — from pixel GTA 1 to neon GTA VI. From 4 Coinz.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openGtaMode}
                    className="flex-1 py-2.5 rounded-full bg-gold text-black text-[11px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                  >
                    Try it
                  </button>
                  <button
                    type="button"
                    onClick={dismissGtaTip}
                    className="px-4 py-2.5 rounded-full border border-white/15 text-[11px] uppercase tracking-widest text-white/50 hover:text-gold hover:border-gold/40 transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
