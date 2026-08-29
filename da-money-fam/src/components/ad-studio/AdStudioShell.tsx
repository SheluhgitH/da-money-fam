'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
import CharacterStudioPanel from './CharacterStudioPanel'
import AdStudioOnboarding from './AdStudioOnboarding'
import { COIN_PACKAGES, packAdCopy, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'
import { GTA_MARKETING_SAMPLES } from '@/lib/gta-marketing-samples'
import { trackCoinzCheckout } from '@/lib/analytics'

export default function AdStudioShell({
  initialBrief = '',
  checkoutStatus = null,
  initialTab = 'video',
  initialImageMode = 'stills',
}: {
  initialBrief?: string
  checkoutStatus?: string | null
  initialTab?: 'video' | 'images'
  initialImageMode?: 'stills' | 'gta' | 'characters'
}) {
  const studio = useAdStudio(initialBrief)
  const images = useImageStudio()
  const [studioTab, setStudioTab] = useState<'video' | 'images'>(initialTab)
  const [imageMode, setImageMode] = useState<'stills' | 'gta' | 'characters'>(initialImageMode)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [buyOpen, setBuyOpen] = useState(false)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showImageTip, setShowImageTip] = useState(false)
  const [showGtaTip, setShowGtaTip] = useState(false)
  /** Assume onboarding open until AdStudioOnboarding reports otherwise — blocks GTA tip stack. */
  const [onboardingOpen, setOnboardingOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (onboardingOpen) return
    try {
      if (sessionStorage.getItem('dmf-gta-style-tip-v2') === '1') {
        if (sessionStorage.getItem('dmf-image-studio-tip') !== '1') {
          setShowImageTip(true)
        }
        return
      }
      setShowGtaTip(true)
    } catch {
      setShowGtaTip(true)
    }
  }, [onboardingOpen])

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
      sessionStorage.setItem('dmf-gta-style-tip-v2', '1')
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
    trackCoinzCheckout(packageId, 'ad_studio_shell')
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

  const applyImageForVideo = (url: string, asFirstFrame = false) => {
    studio.addReferenceFromUrl(url, asFirstFrame)
    setStudioTab('video')
    setToast('Added as character still — Gemini will place them in the opening frame')
    window.setTimeout(() => setToast(null), 4000)
  }

  const balance =
    studioTab === 'images'
      ? images.gtaQuotes[images.gtaQuality]?.balance ?? images.quote?.balance
      : studio.pricing?.balance

  return (
    <div
      className="flex flex-col w-full max-w-[100vw] bg-[#050505] text-white overflow-hidden"
      style={{
        /* svh only — never grow into large viewport while mobile browser chrome still covers the bottom */
        height: '100svh',
        paddingBottom: 'var(--dmf-safe-bottom)',
      }}
    >
      <AdStudioOnboarding onOpenChange={setOnboardingOpen} />
      <div className="pointer-events-none fixed inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_rgba(255,215,0,0.08),_transparent_50%)]" />
      <header
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gold/15 bg-black/70 backdrop-blur-md relative z-30 flex-nowrap"
        style={{ paddingTop: 'max(0.5rem, var(--dmf-safe-top))' }}
      >
        <Link href="/" className="text-gold font-serif text-sm tracking-[0.15em] uppercase shrink-0">
          DMF
        </Link>
        <h1 className="hidden sm:block text-sm font-serif text-gold shrink-0">Ad Studio</h1>
        <div className="flex rounded-full border border-gold/25 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setStudioTab('video')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full ${
              studioTab === 'video' ? 'bg-gold text-black' : 'text-gold/70'
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
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full ${
              studioTab === 'images' ? 'bg-gold text-black' : 'text-gold/70'
            }`}
          >
            Images
          </button>
        </div>
        {studioTab === 'video' && studio.statusText && (
          <span className="hidden lg:inline min-w-0 truncate text-[10px] uppercase tracking-widest text-gold/60">
            {studio.statusText}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {(studio.pricing?.isAuthenticated || images.quote || images.gtaQuotes.fast) && (
            <span className="text-[10px] font-mono text-gold/80 border border-gold/20 px-2 py-1 rounded-md">
              {balance ?? '—'}c
            </span>
          )}
          {(studio.pricing?.isAuthenticated || images.quote || images.gtaQuotes.fast) && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setBuyOpen((o) => !o)
              }}
              className="hidden md:inline-flex text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-gold text-black font-bold"
            >
              Buy Coinz
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label="More"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-full border border-gold/25 text-gold text-lg leading-none"
            >
              ···
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 min-w-[10rem] rounded-xl border border-gold/25 bg-black/95 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLibraryOpen(true)
                    setMenuOpen(false)
                  }}
                  className="md:hidden w-full text-left px-3 py-2 text-[11px] uppercase tracking-wider text-gold"
                >
                  Library
                </button>
                {(studio.pricing?.isAuthenticated || images.quote || images.gtaQuotes.fast) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuyOpen(true)
                      setMenuOpen(false)
                    }}
                    className="md:hidden w-full text-left px-3 py-2 text-[11px] uppercase tracking-wider text-gold"
                  >
                    Buy Coinz
                  </button>
                )}
                <Link
                  href="/account"
                  className="block px-3 py-2 text-[11px] uppercase tracking-wider text-white/70 hover:text-gold"
                  onClick={() => setMenuOpen(false)}
                >
                  Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      {toast && (
        <div className="pointer-events-none fixed top-14 left-1/2 z-[70] -translate-x-1/2 px-3">
          <span className="block max-w-[90vw] text-center text-[10px] uppercase tracking-widest text-black bg-gold px-3 py-1.5 rounded-full shadow-lg">
            {toast}
          </span>
        </div>
      )}

      {studio.queue.some((j) => j.status === 'running' || j.status === 'queued') && (
        <div className="shrink-0 border-b border-gold/15 bg-black/80 px-3 py-2 relative z-10">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gold/50 mb-1.5">Job queue</p>
          <div className="flex gap-2 overflow-x-auto studio-scroll">
            {studio.queue.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className={`shrink-0 min-w-[9rem] rounded-lg border px-2.5 py-1.5 ${
                  job.status === 'running'
                    ? 'border-gold/40 bg-gold/10'
                    : job.status === 'failed'
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-white/10 bg-white/5'
                }`}
              >
                <p className="text-[10px] text-white/80 truncate">{job.label}</p>
                <p className="text-[8px] uppercase tracking-wider text-gold/60 mt-0.5">
                  {job.status}
                  {job.status === 'running' && studio.statusText ? ` · ${studio.statusText}` : ''}
                </p>
                {job.status === 'running' && (
                  <button
                    type="button"
                    onClick={studio.cancelGenerate}
                    className="mt-1 text-[8px] uppercase tracking-wider text-red-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
          <aside className="hidden md:flex w-80 lg:w-96 border-r border-gold/15 flex-col min-h-0 overflow-hidden bg-black/50 backdrop-blur-sm">
            <p className="shrink-0 px-3 pt-3 pb-1 text-[10px] uppercase tracking-widest text-gold/50">
              Images
            </p>
            <ImageLibrary
              items={images.library}
              selectedUrl={images.previewUrl}
              onSelect={(url) => {
                setImageMode('stills')
                images.useImageAsEdit(url)
              }}
              onEdit={(url) => {
                setImageMode('stills')
                images.useImageAsEdit(url)
              }}
              onUseForVideo={applyImageForVideo}
              onUseAsFirst={(url) => applyImageForVideo(url, true)}
            />
          </aside>
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="shrink-0 flex gap-1 px-3 pt-2 pb-1 overflow-x-auto studio-scroll flex-nowrap">
              <button
                type="button"
                onClick={() => setImageMode('stills')}
                className={`shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
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
                className={`shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                  imageMode === 'gta'
                    ? 'bg-gold text-black border-gold'
                    : 'border-gold/25 text-gold/70'
                }`}
              >
                GTA Styles
              </button>
              <button
                type="button"
                onClick={() => setImageMode('characters')}
                className={`shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                  imageMode === 'characters'
                    ? 'bg-gold text-black border-gold'
                    : 'border-gold/25 text-gold/70'
                }`}
              >
                Characters
              </button>
            </div>
            {imageMode === 'gta' ? (
              <GtaStylePanel images={images} onUseForVideo={applyImageForVideo} />
            ) : imageMode === 'characters' ? (
              <CharacterStudioPanel
                images={images}
                onUseForVideo={(url, characterId, styleId) => {
                  applyImageForVideo(url)
                  if (characterId) studio.setLookCharacterId(characterId)
                  if (styleId === 'photoreal') {
                    setToast(
                      'Mini/Fast auto-prepare this photoreal sheet. Lite works unmarked at lower cost.'
                    )
                    window.setTimeout(() => setToast(null), 5000)
                  }
                }}
                onMakeStoryboard={(url) => {
                  studio.startStoryboardFromStill(url)
                  setStudioTab('video')
                }}
              />
            ) : (
              <ImageStudioPanel
                images={images}
                onUseForVideo={applyImageForVideo}
                onMakeStoryboard={(url) => {
                  studio.startStoryboardFromStill(url, images.prompt)
                  setStudioTab('video')
                  setToast('Storyboard started from still')
                  window.setTimeout(() => setToast(null), 4000)
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0 relative z-10">
          <aside className="hidden md:flex w-80 lg:w-96 border-r border-gold/15 flex-col min-h-0 overflow-hidden bg-black/50 backdrop-blur-sm">
            <GenerationLibrary studio={studio} />
          </aside>

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <PreviewCanvas studio={studio} />
            <div className="shrink-0 border-t border-gold/20 bg-black/80 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.6)] max-h-[min(48svh,480px)] overflow-y-auto overflow-x-visible overscroll-contain">
              <PromptDock studio={studio} />
            </div>
          </div>
        </div>
      )}

      {libraryOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setLibraryOpen(false)}>
          <div
            className="absolute inset-y-0 left-0 w-[85%] max-w-sm bg-matte-black border-r border-gold/20 flex flex-col h-full min-h-0 overflow-hidden pt-[env(safe-area-inset-top)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between px-3 py-3 border-b border-gold/15">
              <p className="text-[10px] uppercase tracking-widest text-gold/60">Library</p>
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="text-[11px] uppercase tracking-wider text-white/50 hover:text-gold"
              >
                Close
              </button>
            </div>
            {studioTab === 'images' ? (
              <ImageLibrary
                items={images.library}
                selectedUrl={images.previewUrl}
                onSelect={(url) => {
                  setImageMode('stills')
                  images.useImageAsEdit(url)
                  setLibraryOpen(false)
                }}
                onEdit={(url) => {
                  setImageMode('stills')
                  images.useImageAsEdit(url)
                  setLibraryOpen(false)
                }}
                onUseForVideo={(url) => {
                  applyImageForVideo(url)
                  setLibraryOpen(false)
                }}
                onUseAsFirst={(url) => {
                  applyImageForVideo(url, true)
                  setLibraryOpen(false)
                }}
              />
            ) : (
              <GenerationLibrary studio={studio} onCloseMobile={() => setLibraryOpen(false)} />
            )}
          </div>
        </div>
      )}

      {portalReady &&
        createPortal(
          <AnimatePresence>
            {showGtaTip && !onboardingOpen && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center box-border"
                style={{
                  width: '100vw',
                  maxWidth: '100%',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
                  paddingTop: 'max(1rem, var(--dmf-safe-top))',
                  paddingBottom: 'max(1rem, var(--dmf-safe-bottom))',
                }}
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10 w-full mx-auto rounded-2xl border border-gold/30 bg-[#0c0c0c] p-6 shadow-[0_0_60px_rgba(255,215,0,0.12)]"
                  style={{ maxWidth: 'min(24rem, calc(100vw - 2rem))' }}
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
                    <p className="text-sm text-white/55 leading-relaxed mb-4">
                      Turn any photo into every Rockstar era — from pixel GTA 1 to neon GTA VI. From 4 Coinz.
                    </p>
                    <div className="flex gap-2 mb-5 overflow-hidden">
                      {GTA_MARKETING_SAMPLES.map((sample) => (
                        <div
                          key={sample.id}
                          className="relative flex-1 aspect-[3/4] rounded-lg overflow-hidden border border-gold/25"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sample.url}
                            alt={sample.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-1 pb-1 pt-4">
                            <span className="block text-[8px] uppercase tracking-wider text-gold truncate text-center">
                              {sample.label}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={openGtaMode}
                        className="flex-1 min-w-0 py-2.5 rounded-full bg-gold text-black text-[11px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
                      >
                        Try it
                      </button>
                      <button
                        type="button"
                        onClick={dismissGtaTip}
                        className="shrink-0 px-4 py-2.5 rounded-full border border-white/15 text-[11px] uppercase tracking-widest text-white/50 hover:text-gold hover:border-gold/40 transition-colors"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}
