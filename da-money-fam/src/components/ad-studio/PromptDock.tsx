'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdStudioController } from '@/hooks/useAdStudio'
import LookDrawer from './LookDrawer'
import StoryboardTimeline from './StoryboardTimeline'
import CoinzPriceCut from './CoinzPriceCut'
import StudioTemplateChips from './StudioTemplateChips'
import { COIN_PACKAGES, packAdCopy, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'
import { SEEDANCE_MODELS, audioAddonCoins } from '@/lib/seedance-models'
import { legacyVideoPrice } from '@/lib/ad-studio-legacy-prices'

import { ASSISTANT_OPEN_EVENT } from '@/lib/assistant-visibility'

export default function PromptDock({ studio }: { studio: AdStudioController }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [optionsOpen, setOptionsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => setOptionsOpen(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const price =
    studio.pricing?.totalPriceCoins ??
    studio.pricing?.priceCoins ??
    SEEDANCE_MODELS.mini.baseCoins
  const perClip = studio.pricing?.priceCoins ?? SEEDANCE_MODELS.mini.baseCoins
  const units =
    studio.mode === 'storyboard'
      ? studio.sceneBriefs.length
      : studio.variations
  const showBreakdown = units > 1 && studio.pricing?.totalPriceCoins != null
  const canAfford = studio.pricing?.canAfford !== false
  const showBuy = studio.pricing?.isAuthenticated && !canAfford && !studio.generating

  const lite = studio.pricing?.modelPrices?.lite
  const mini = studio.pricing?.modelPrices?.mini
  const fast = studio.pricing?.modelPrices?.fast
  const durationPrices = studio.pricing?.durationPrices
  const modelCfg = SEEDANCE_MODELS[studio.modelKey]
  const legacyLite = legacyVideoPrice('lite', studio.duration)
  const legacyFast = legacyVideoPrice('fast', studio.duration)
  const legacyPerClip = legacyVideoPrice(studio.modelKey, studio.duration)
  const legacyTotal = legacyPerClip != null ? legacyPerClip * units : null
  const audioAddon =
    studio.pricing?.audioAddonCoins ??
    (modelCfg.supportsAudio ? audioAddonCoins(modelCfg.baseCoins) : 0)

  const buyPack = async (packageId: string) => {
    setBuyingId(packageId)
    studio.setError(null)
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
    }
  }

  return (
    <div className="bg-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              studio.mode === 'single'
                ? 'bg-gold text-black border-gold'
                : 'border-gold/25 text-gold/70'
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
          <button
            type="button"
            onClick={() => setOptionsOpen((o) => !o)}
            className={`shrink-0 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border ${
              optionsOpen ? 'border-gold text-gold' : 'border-white/15 text-white/60'
            }`}
          >
            Options
          </button>
        </div>

        {studio.mode === 'storyboard' && <StoryboardTimeline studio={studio} />}

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['Write my prompt', 'Write a video prompt for this look. Give 2 options then wait.'],
              ['Make it 3 scenes', 'Split this into 3 scenes. Keep wardrobe and character consistent.'],
              ['Keep this character', 'Keep this character in every scene. Use their name if I have one.'],
            ] as const
          ).map(([label, seed]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(ASSISTANT_OPEN_EVENT, { detail: { askBar: true, seed } })
                )
              }
              className="text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/30 text-gold/80"
            >
              Help · {label}
            </button>
          ))}
        </div>

        {optionsOpen && (
          <div className="space-y-2.5 max-h-[36vh] md:max-h-[42vh] overflow-y-auto studio-scroll pr-0.5">
            <div className="flex gap-1.5 overflow-x-auto studio-scroll flex-nowrap">
              {(
                [
                  ['hook', '15s hook'],
                  ['hero', 'Product hero'],
                  ['end', 'End card'],
                  ['storyboard', 'Storyboard 3-shot'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => studio.applyJobChip(id)}
                  className="shrink-0 text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/25 text-gold/80"
                >
                  {label}
                </button>
              ))}
            </div>

            {studio.mode === 'single' && (
              <StudioTemplateChips onPick={(t) => studio.applyTemplate(t.video, t.creative)} />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => studio.setModelKey('lite')}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  studio.modelKey === 'lite'
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
                title="Seedance 1.5 Pro"
              >
                Lite ·{' '}
                <CoinzPriceCut
                  current={lite?.priceCoins ?? SEEDANCE_MODELS.lite.baseCoins}
                  legacy={legacyLite}
                />
              </button>
              <button
                type="button"
                onClick={() => studio.setModelKey('mini')}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  studio.modelKey === 'mini'
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
                title="Seedance 2.0 Mini"
              >
                Mini · {mini?.priceCoins ?? SEEDANCE_MODELS.mini.baseCoins}
              </button>
              <button
                type="button"
                onClick={() => studio.setModelKey('fast')}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  studio.modelKey === 'fast'
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
                title="Seedance 2.0 Fast"
              >
                Fast ·{' '}
                <CoinzPriceCut
                  current={fast?.priceCoins ?? SEEDANCE_MODELS.fast.baseCoins}
                  legacy={legacyFast}
                />
              </button>
              {modelCfg.durations.map((d) => {
                const dp = durationPrices?.[d]
                const current = dp?.priceCoins
                const legacy = legacyVideoPrice(studio.modelKey, d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => studio.setDuration(d)}
                    className={`text-[10px] font-mono px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                      studio.duration === d
                        ? 'bg-gold text-black border-gold'
                        : 'border-white/15 text-white/60'
                    }`}
                  >
                    {d}s ·{' '}
                    {current != null ? (
                      <CoinzPriceCut current={current} legacy={legacy} />
                    ) : (
                      'â€”'
                    )}
                  </button>
                )
              })}
              {modelCfg.supportsAudio && (
                <button
                  type="button"
                  onClick={() => studio.setGenerateAudio(!studio.generateAudio)}
                  className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                    studio.generateAudio
                      ? 'bg-gold text-black border-gold'
                      : 'border-white/15 text-white/60'
                  }`}
                >
                  Sound {studio.generateAudio ? 'on' : 'off'}
                  {!studio.generateAudio && audioAddon > 0 ? ` · +${audioAddon}` : ''}
                </button>
              )}
              {modelCfg.resolutions.includes('720p') && (
                <>
                  <button
                    type="button"
                    onClick={() => studio.setResolution('480p')}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                      studio.resolution === '480p'
                        ? 'bg-gold text-black border-gold'
                        : 'border-white/15 text-white/60'
                    }`}
                  >
                    480
                  </button>
                  <button
                    type="button"
                    onClick={() => studio.setResolution('720p')}
                    className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                      studio.resolution === '720p'
                        ? 'bg-gold text-black border-gold'
                        : 'border-white/15 text-white/60'
                    }`}
                  >
                    720
                  </button>
                </>
              )}
              <select
                value={studio.aspectRatio}
                onChange={(e) => studio.setAspectRatio(e.target.value)}
                className="bg-black border border-white/15 rounded-md px-2 py-1.5 min-h-[28px] text-[10px] text-white outline-none"
              >
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
                <option value="16:9">16:9</option>
              </select>
              {studio.mode === 'single' && (
                <>
                  <button
                    type="button"
                    onClick={() => studio.setVariations(1)}
                    className={`text-[10px] px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                      studio.variations === 1
                        ? 'bg-gold text-black border-gold'
                        : 'border-white/15 text-white/60'
                    }`}
                  >
                    1x
                  </button>
                  <button
                    type="button"
                    onClick={() => studio.setVariations(2)}
                    className={`text-[10px] px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                      studio.variations === 2
                        ? 'bg-gold text-black border-gold'
                        : 'border-white/15 text-white/60'
                    }`}
                  >
                    2x
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => studio.setLookOpen(!studio.lookOpen)}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  studio.lookOpen ? 'border-gold text-gold' : 'border-white/15 text-white/60'
                }`}
              >
                Look
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await studio.savePreset()
                  } catch (err) {
                    studio.setError(err instanceof Error ? err.message : 'Failed to save look')
                  }
                }}
                className="text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border border-gold/30 text-gold/80"
              >
                Save look
              </button>
            </div>

            {studio.presets.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto studio-scroll flex-nowrap">
                {studio.presets.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => studio.applyPreset(p)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      studio.deletePreset(p.id)
                    }}
                    className="shrink-0 text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/20 text-gold/70"
                    title="Click to apply · right-click to delete"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            <LookDrawer studio={studio} />
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
          multiple
          className="hidden"
          onChange={(e) => {
            studio.addReferenceFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {studio.mode === 'single' && (
          <div className="flex gap-2 items-end">
            <textarea
              rows={2}
              value={studio.brief}
              onChange={(e) => studio.setBrief(e.target.value)}
              placeholder="Optional — add a still and Generate, or pick a shot…"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-2xl p-3 text-white text-sm outline-none focus:border-gold resize-none"
            />
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(studio.brief).catch(() => {})
                }}
                className="h-8 px-3 rounded-xl border border-gold/30 text-gold text-[10px] uppercase tracking-wider"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent(ASSISTANT_OPEN_EVENT, {
                      detail: { askBar: true, seed: 'Help write this video prompt.' },
                    })
                  )
                }
                className="h-8 px-3 rounded-xl border border-gold/30 text-gold text-[10px] uppercase tracking-wider"
              >
                Help write
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-11 px-3 rounded-2xl border border-gold/30 text-gold text-[10px] uppercase tracking-wider"
                title="Add stills or MP3/WAV"
              >
                Attach
              </button>
            </div>
          </div>
        )}

        {studio.mode === 'storyboard' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/25 text-gold/80"
            >
              Attach refs
            </button>
            <span className="text-[10px] text-white/35 hidden sm:inline">
              Scenes share stills and one MP3/WAV
            </span>
          </div>
        )}

        {studio.references.length > 0 && (
          <div className="flex gap-2 overflow-x-auto studio-scroll flex-nowrap pb-0.5">
            {studio.references.map((ref, index) => (
              <div key={`${index}-${ref.url.slice(0, 24)}`} className="w-[4.5rem] shrink-0 flex flex-col gap-1">
                <div
                  className={`relative w-full h-14 rounded-lg overflow-hidden border ${
                    ref.kind === 'audio' ? 'border-gold/40 bg-black/60' : 'border-gold/25'
                  }`}
                >
                  {ref.kind === 'audio' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
                      <span className="text-gold text-[9px] uppercase tracking-wider">MP3</span>
                      <span className="text-white/50 text-[8px] truncate w-full text-center">
                        {ref.name || 'audio'}
                      </span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ref.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => studio.removeReference(index)}
                    className="absolute top-0.5 right-0.5 w-6 h-6 rounded bg-black/80 text-white text-xs"
                  >
                    x
                  </button>
                </div>
                {ref.kind !== 'audio' && (
                  <button
                    type="button"
                    onClick={() => studio.cycleRefRole(index)}
                    className="text-[8px] uppercase tracking-wider text-gold/80 border border-gold/20 rounded-full py-0.5 hover:bg-gold/10"
                    title="Tap to cycle: Opens → Later → Identity"
                  >
                    {ref.refRole === 'opening_subject'
                      ? 'Opens'
                      : ref.refRole === 'appears_later'
                        ? 'Later'
                        : 'Identity'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {studio.references.some((r) => r.kind !== 'audio') && (
          <p className="text-[10px] text-white/40">
            Stills guide identity and timing—they are not frozen start/end frames. Tap a badge to
            override (Opens / Later / Identity).
          </p>
        )}

        {showBreakdown && (
          <p className="text-[10px] text-white/40 font-mono">
            {units} x {perClip} = {price} Coinz
            {studio.pricing?.tierOrFanClub ? ` · ${studio.pricing.tierOrFanClub} discount` : ''}
          </p>
        )}

        {showBuy && (
          <div className="rounded-xl border border-gold/25 bg-gold/5 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gold/80">
              Need more Coinz · {studio.pricing?.balance ?? 0} on hand · {price} required
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {packs.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  disabled={buyingId !== null}
                  onClick={() => buyPack(pkg.id)}
                  className="flex-1 text-left px-3 py-2 rounded-lg border border-gold/30 hover:bg-gold hover:text-black transition-colors disabled:opacity-50"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider">
                    {buyingId === pkg.id ? 'Redirecting...' : packAdCopy(pkg)}
                  </span>
                  <span className="block text-[9px] opacity-70 mt-0.5">
                    {pkg.amount} Coinz · ${pkg.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {studio.generating ? (
          <button
            type="button"
            onClick={studio.cancelGenerate}
            className="w-full py-3 rounded-full border border-red-400/50 text-red-300 text-xs font-bold uppercase tracking-widest"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={studio.generate}
            disabled={!studio.canGenerate || !canAfford}
            className="w-full py-3 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate ·{' '}
            <CoinzPriceCut current={price} legacy={legacyTotal} suffix=" Coinz" />
          </button>
        )}
      </div>
    </div>
  )
}
