'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdStudioController } from '@/hooks/useAdStudio'
import StoryboardTimeline from './StoryboardTimeline'
import CoinzPriceCut from './CoinzPriceCut'
import StudioTemplateChips from './StudioTemplateChips'
import StudioSetupStrip from './StudioSetupStrip'
import StudioInlinePicker from './StudioInlinePicker'
import { COIN_PACKAGES, packAdCopy, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'
import { SEEDANCE_MODELS } from '@/lib/seedance-models'
import { MOTION_MODES } from '@/lib/ad-studio-motion'
import { legacyVideoPrice } from '@/lib/ad-studio-legacy-prices'

export default function PromptDock({ studio }: { studio: AdStudioController }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [shotsOpen, setShotsOpen] = useState(false)
  const [refRoleIndex, setRefRoleIndex] = useState<number | null>(null)
  /** When set, next still tap assigns Start or End for A→B / Lock start. */
  const [assignSlot, setAssignSlot] = useState<'start' | 'end' | null>(null)
  const frameAttachSlot = useRef<'start' | 'end' | null>(null)
  const prevRefCount = useRef(studio.references.length)

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])

  // After attaching a photo for a Start/End slot, mark the newest still
  useEffect(() => {
    const slot = frameAttachSlot.current
    const grew = studio.references.length > prevRefCount.current
    prevRefCount.current = studio.references.length
    if (!slot || !grew) return
    const lastImg = [...studio.references]
      .map((r, i) => ({ r, i }))
      .reverse()
      .find(({ r }) => r.kind !== 'audio' && r.url.startsWith('http'))
    if (!lastImg) return
    frameAttachSlot.current = null
    studio.setRefRole(lastImg.i, slot)
    setAssignSlot(null)
  }, [studio.references, studio])

  const price =
    studio.pricing?.totalPriceCoins ??
    studio.pricing?.priceCoins ??
    SEEDANCE_MODELS.mini.baseCoins
  const perClip = studio.pricing?.priceCoins ?? SEEDANCE_MODELS.mini.baseCoins
  const units = studio.mode === 'storyboard' ? studio.sceneBriefs.length : studio.variations
  const showBreakdown = units > 1 && studio.pricing?.totalPriceCoins != null
  const canAfford = studio.pricing?.canAfford !== false
  const showBuy = studio.pricing?.isAuthenticated && !canAfford && !studio.generating
  const legacyPerClip = legacyVideoPrice(studio.modelKey, studio.duration)
  const legacyTotal = legacyPerClip != null ? legacyPerClip * units : null
  const motionMeta = MOTION_MODES.find((m) => m.id === studio.motionMode)

  const buyPack = async (packageId: string) => {
    setBuyingId(packageId)
    studio.setError(null)
    try {
      const { trackCoinzCheckout } = await import('@/lib/analytics')
      trackCoinzCheckout(packageId, 'prompt_dock')
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
    }
  }

  const startRef = studio.references.find((r) => r.kind !== 'audio' && r.useAsFirstFrame)
  const endRef = studio.references.find((r) => r.kind !== 'audio' && r.useAsLastFrame)
  const needsFrames =
    studio.motionMode === 'animate_ab' || studio.motionMode === 'lock_start'

  const assignStillToSlot = (index: number, slot: 'start' | 'end') => {
    studio.setRefRole(index, slot)
    setAssignSlot(null)
  }

  const onFrameSlotAttach = (slot: 'start' | 'end') => {
    frameAttachSlot.current = slot
    fileRef.current?.click()
  }

  const refRoleLabel = (index: number) => {
    const ref = studio.references[index]
    if (!ref || ref.kind === 'audio') return ''
    if (ref.useAsFirstFrame) return 'Start'
    if (ref.useAsLastFrame) return 'End'
    if (ref.refRole === 'opening_subject') return 'Opens'
    if (ref.refRole === 'appears_later') return 'Later'
    return 'Identity'
  }

  const refRoleValue =
    refRoleIndex != null
      ? (() => {
          const ref = studio.references[refRoleIndex]
          if (!ref) return 'identity'
          if (ref.useAsFirstFrame) return 'start'
          if (ref.useAsLastFrame) return 'end'
          return ref.refRole || 'identity'
        })()
      : 'identity'

  const refRoleOptions = [
    { id: 'opening_subject', label: 'Opens', hint: 'Appears early' },
    { id: 'appears_later', label: 'Later', hint: 'Mid / end reveal' },
    { id: 'identity', label: 'Identity', hint: 'Likeness only' },
    { id: 'start', label: 'Start', hint: 'Frozen first frame' },
    { id: 'end', label: 'End', hint: 'Frozen last frame' },
  ]

  return (
    <div className="bg-transparent pb-3">
      {studio.error && (
        <div className="px-3 pt-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2">
            <p className="text-xs text-red-300">{studio.error}</p>
            <button
              type="button"
              onClick={() => studio.setError(null)}
              className="text-red-300/70 hover:text-white text-sm shrink-0"
            >
              x
            </button>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2.5">
        <div className="flex gap-2 overflow-x-auto studio-scroll flex-nowrap">
          <button
            type="button"
            onClick={() => studio.resetJob()}
            className="shrink-0 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/15 text-white/60"
          >
            New
          </button>
          <button
            type="button"
            onClick={() => studio.setMode('single')}
            className={`shrink-0 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              studio.mode === 'single' ? 'bg-gold text-black border-gold' : 'border-gold/25 text-gold/70'
            }`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => studio.setMode('storyboard')}
            className={`shrink-0 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              studio.mode === 'storyboard'
                ? 'bg-gold text-black border-gold'
                : 'border-gold/25 text-gold/70'
            }`}
          >
            Storyboard
          </button>
        </div>

        {studio.mode === 'storyboard' && <StoryboardTimeline studio={studio} />}

        <StudioSetupStrip studio={studio} />

        <div>
          <button
            type="button"
            onClick={() => setShotsOpen((o) => !o)}
            className="text-[10px] uppercase tracking-wider text-white/40 hover:text-gold"
          >
            {shotsOpen ? 'Hide shot ideas' : 'Shot ideas'}
          </button>
          {shotsOpen && (
            <div className="mt-2">
              <StudioTemplateChips
                storyboardMode={studio.mode === 'storyboard'}
                onPick={(t) => studio.applyTemplate(t.video, t.creative)}
                onPickStoryboard={(t) => studio.applyStoryboardTemplate(t.scenes, t.creative)}
              />
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            studio.addReferenceFiles(files)
            e.target.value = ''
            // frameAttachSlot kept until refs update (see effect)
            if (!frameAttachSlot.current && assignSlot) {
              frameAttachSlot.current = assignSlot
            }
          }}
        />

        {needsFrames && (
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">
              {studio.motionMode === 'animate_ab' ? 'Start → End frames' : 'Start frame'}
            </p>
            <p className="text-[10px] text-white/45">
              {assignSlot
                ? `Tap a still below to set ${assignSlot === 'start' ? 'Start' : 'End'}, or attach a new photo.`
                : studio.motionMode === 'animate_ab'
                  ? 'Pick the opening still and the ending still. Seedance animates between them.'
                  : 'Pick the still that locks the first frame.'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const hasStills = studio.references.some((r) => r.kind !== 'audio')
                  if (startRef) {
                    setAssignSlot((s) => (s === 'start' ? null : 'start'))
                  } else if (hasStills) {
                    setAssignSlot('start')
                  } else {
                    setAssignSlot('start')
                    onFrameSlotAttach('start')
                  }
                }}
                className={`flex-1 min-h-[4.5rem] rounded-xl border overflow-hidden text-left ${
                  assignSlot === 'start'
                    ? 'border-gold ring-1 ring-gold'
                    : startRef
                      ? 'border-gold/40'
                      : 'border-dashed border-gold/35'
                }`}
              >
                {startRef ? (
                  <div className="relative h-full min-h-[4.5rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={startRef.url} alt="Start" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-wider text-gold">
                      Start · tap to change
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[4.5rem] gap-1 px-2">
                    <span className="text-[10px] uppercase tracking-wider text-gold">Start</span>
                    <span className="text-[9px] text-white/40 text-center">Attach or tap a still</span>
                  </div>
                )}
              </button>
              {studio.motionMode === 'animate_ab' && (
                <button
                  type="button"
                  onClick={() => {
                    const hasStills = studio.references.some((r) => r.kind !== 'audio')
                    if (endRef) {
                      setAssignSlot((s) => (s === 'end' ? null : 'end'))
                    } else if (hasStills) {
                      setAssignSlot('end')
                    } else {
                      setAssignSlot('end')
                      onFrameSlotAttach('end')
                    }
                  }}
                  className={`flex-1 min-h-[4.5rem] rounded-xl border overflow-hidden text-left ${
                    assignSlot === 'end'
                      ? 'border-gold ring-1 ring-gold'
                      : endRef
                        ? 'border-gold/40'
                        : 'border-dashed border-gold/35'
                  }`}
                >
                  {endRef ? (
                    <div className="relative h-full min-h-[4.5rem]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={endRef.url} alt="End" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/75 px-2 py-1 text-[9px] uppercase tracking-wider text-gold">
                        End · tap to change
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[4.5rem] gap-1 px-2">
                      <span className="text-[10px] uppercase tracking-wider text-gold">End</span>
                      <span className="text-[9px] text-white/40 text-center">Attach or tap a still</span>
                    </div>
                  )}
                </button>
              )}
            </div>
            {(startRef || endRef) && (
              <div className="flex gap-2">
                {!startRef && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssignSlot('start')
                    }}
                    className="text-[9px] uppercase tracking-wider text-gold/80 underline"
                  >
                    Choose Start from stills
                  </button>
                )}
                {studio.motionMode === 'animate_ab' && !endRef && (
                  <button
                    type="button"
                    onClick={() => setAssignSlot('end')}
                    className="text-[9px] uppercase tracking-wider text-gold/80 underline"
                  >
                    Choose End from stills
                  </button>
                )}
                {startRef && (
                  <button
                    type="button"
                    onClick={() => onFrameSlotAttach('start')}
                    className="text-[9px] uppercase tracking-wider text-white/40 hover:text-gold"
                  >
                    New Start photo
                  </button>
                )}
                {studio.motionMode === 'animate_ab' && endRef && (
                  <button
                    type="button"
                    onClick={() => onFrameSlotAttach('end')}
                    className="text-[9px] uppercase tracking-wider text-white/40 hover:text-gold"
                  >
                    New End photo
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {studio.mode === 'single' && (
          <div className="flex gap-2 items-end">
            <textarea
              rows={2}
              value={studio.brief}
              onChange={(e) => studio.setBrief(e.target.value)}
              placeholder="Describe the ad — or attach stills and Generate…"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl p-3 text-white text-sm outline-none focus:border-gold resize-none"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 h-11 px-3 rounded-2xl border border-gold/30 text-gold text-[10px] uppercase tracking-wider"
            >
              Attach
            </button>
          </div>
        )}

        {studio.mode === 'storyboard' && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/25 text-gold/80"
          >
            Attach refs
          </button>
        )}

        {studio.references.length > 0 && (
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto studio-scroll flex-nowrap pb-0.5">
              {studio.references.map((ref, index) => (
                <div
                  key={`${index}-${ref.url.slice(0, 24)}`}
                  className="w-[4.5rem] shrink-0 flex flex-col gap-1 relative"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (ref.kind === 'audio') return
                      if (assignSlot) {
                        assignStillToSlot(index, assignSlot)
                        return
                      }
                      setRefRoleIndex((cur) => (cur === index ? null : index))
                    }}
                    className={`relative w-full h-14 rounded-lg overflow-hidden border text-left ${
                      ref.kind === 'audio'
                        ? 'border-gold/40 bg-black/60'
                        : assignSlot
                          ? 'border-gold ring-1 ring-gold'
                          : ref.useAsFirstFrame || ref.useAsLastFrame
                            ? 'border-gold'
                            : 'border-gold/25'
                    }`}
                  >
                    {ref.kind === 'audio' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                        <span className="text-gold text-[9px] uppercase tracking-wider">MP3</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ref.url}
                        alt={ref.name || `Reference ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      studio.removeReference(index)
                    }}
                    className="absolute top-0.5 right-0.5 w-6 h-6 rounded bg-black/80 text-white text-xs z-10"
                  >
                    x
                  </button>
                  {ref.kind !== 'audio' && (
                    <button
                      type="button"
                      onClick={() =>
                        setRefRoleIndex((cur) => (cur === index ? null : index))
                      }
                      className="text-[8px] uppercase tracking-wider text-gold/80 border border-gold/20 rounded-full py-0.5 hover:bg-gold/10"
                    >
                      {refRoleLabel(index)}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {refRoleIndex != null && (
              <StudioInlinePicker
                label="Role"
                tip="How this still is used in the shot."
                value={refRoleValue}
                options={refRoleOptions}
                onChange={(id) => {
                  studio.setRefRole(
                    refRoleIndex,
                    id as 'opening_subject' | 'appears_later' | 'identity' | 'start' | 'end'
                  )
                  setRefRoleIndex(null)
                }}
              />
            )}
            <p className="text-[10px] text-white/40 mt-1">
              {assignSlot
                ? `Selecting ${assignSlot === 'start' ? 'Start' : 'End'} frame — tap a still.`
                : needsFrames
                  ? 'Start / End slots above · or tap a still badge.'
                  : `Tap a badge for Opens / Later / Identity. Motion · ${motionMeta?.label}.`}
            </p>
          </div>
        )}

        {showBreakdown && (
          <p className="text-[10px] text-white/40 font-mono">
            {units} x {perClip} = {price} Coinz
            {studio.pricing?.tierOrFanClub ? ` · ${studio.pricing.tierOrFanClub} discount` : ''}
          </p>
        )}

        {!studio.generating && studio.canGenerate && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/45">Cost preview</p>
              <p className="text-xs text-white font-mono">
                <CoinzPriceCut current={price} legacy={legacyTotal} suffix=" Coinz" />
                {showBreakdown ? ` · ${units} clips` : ''}
              </p>
            </div>
            <p className="text-[10px] text-white/40">
              {SEEDANCE_MODELS[studio.modelKey].label} · {studio.duration}s · {studio.motionMode}
            </p>
          </div>
        )}

        {showBuy && (
          <div className="flex flex-wrap gap-2">
            {packs.slice(0, 3).map((pkg) => (
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
          </div>
        )}

        <button
          type="button"
          disabled={!studio.canGenerate || studio.generating || !canAfford}
          onClick={() => void studio.generate()}
          className="w-full py-3 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-40"
        >
          {studio.generating ? studio.statusText || 'Generating…' : `Generate · ${price}c`}
        </button>
      </div>
    </div>
  )
}
