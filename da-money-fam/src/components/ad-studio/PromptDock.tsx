'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdStudioController } from '@/hooks/useAdStudio'
import LookDrawer from './LookDrawer'
import StoryboardTimeline from './StoryboardTimeline'
import { COIN_PACKAGES, packAdCopy, type CoinPackage } from '@/lib/coin-packages'
import { packsFromSettings } from '@/lib/site-settings'
import {
  AD_PROMPT_TEMPLATES,
  PROMPT_TEMPLATE_GROUPS,
  type PromptTemplateGroup,
} from '@/lib/ad-prompt-templates'

function CoinPriceLabel({
  effective,
  base,
  discounted,
}: {
  effective: number
  base: number
  discounted: boolean
}) {
  if (discounted && base !== effective) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="line-through opacity-50">{base}</span>
        <span>{effective}</span>
      </span>
    )
  }
  return <span>{effective}</span>
}

export default function PromptDock({ studio }: { studio: AdStudioController }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [packs, setPacks] = useState<CoinPackage[]>(COIN_PACKAGES)
  const [templateGroup, setTemplateGroup] = useState<PromptTemplateGroup | 'all'>('all')

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setPacks(packsFromSettings(data.settings?.['ad_studio.packs'])))
      .catch(() => {})
  }, [])
  const price = studio.pricing?.totalPriceCoins ?? studio.pricing?.priceCoins ?? 40
  const perClip = studio.pricing?.priceCoins ?? 40
  const discountPercent = studio.pricing?.discountPercent ?? 0
  const discounted = discountPercent > 0
  const units =
    studio.mode === 'storyboard'
      ? studio.sceneBriefs.length
      : studio.variations
  const showBreakdown = units > 1 && studio.pricing?.totalPriceCoins != null
  const canAfford = studio.pricing?.canAfford !== false
  const showBuy = studio.pricing?.isAuthenticated && !canAfford && !studio.generating

  const lite = studio.pricing?.modelPrices?.lite
  const fast = studio.pricing?.modelPrices?.fast
  const durationPrices = studio.pricing?.durationPrices

  const templates =
    templateGroup === 'all'
      ? AD_PROMPT_TEMPLATES
      : AD_PROMPT_TEMPLATES.filter((t) => t.group === templateGroup)

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
    <div className="bg-transparent">
      {studio.error && (
        <div className="px-4 pt-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2">
            <p className="text-xs text-red-300">{studio.error}</p>
            <button
              type="button"
              onClick={() => studio.setError(null)}
              className="text-red-300/70 hover:text-white text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <StoryboardTimeline studio={studio} />
      <LookDrawer studio={studio} />

      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => studio.setMode('single')}
            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
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
            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              studio.mode === 'storyboard'
                ? 'bg-gold text-black border-gold'
                : 'border-gold/25 text-gold/70'
            }`}
          >
            Storyboard
          </button>
        </div>

        {studio.mode === 'single' && (
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setTemplateGroup('all')}
                className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
                  templateGroup === 'all'
                    ? 'border-gold text-gold'
                    : 'border-white/10 text-white/40'
                }`}
              >
                Starters
              </button>
              {PROMPT_TEMPLATE_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setTemplateGroup(g.id)}
                  className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
                    templateGroup === g.id
                      ? 'border-gold text-gold'
                      : 'border-white/10 text-white/40'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => studio.applyTemplate(t.brief, t.creative)}
                  className="shrink-0 text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/20 text-gold/70 hover:border-gold/50"
                  title={t.brief}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {studio.mode === 'single' && (
          <div className="relative">
            <textarea
              rows={2}
              value={studio.brief}
              onChange={(e) => studio.setBrief(e.target.value)}
              placeholder="Describe your 6–10 second ad…"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 pr-12 text-white text-sm outline-none focus:border-gold resize-none"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                studio.addReferenceFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-full border border-gold/30 text-gold hover:bg-gold hover:text-black transition-colors text-lg leading-none"
              title="Add reference images"
            >
              +
            </button>
          </div>
        )}

        {studio.mode === 'storyboard' && (
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                studio.addReferenceFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/25 text-gold/80 hover:border-gold"
            >
              + Refs
            </button>
            <span className="text-[10px] text-white/35">
              Scenes use shared refs; last frame chains between shots
            </span>
          </div>
        )}

        {studio.references.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {studio.references.map((ref, index) => (
              <div key={`${index}-${ref.url.slice(0, 24)}`} className="w-16 flex flex-col gap-1">
                <div
                  className={`relative w-16 h-14 rounded-lg overflow-hidden border ${
                    ref.useAsFirstFrame ? 'border-gold' : 'border-gold/25'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => studio.removeReference(index)}
                    className="absolute top-0 right-0 w-5 h-5 bg-black/80 text-white text-xs"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => studio.toggleFirstFrame(index)}
                  className={`text-[7px] uppercase tracking-wide px-1 py-0.5 rounded border ${
                    ref.useAsFirstFrame
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'border-white/15 text-white/40'
                  }`}
                >
                  {ref.useAsFirstFrame ? 'First' : 'As first'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => studio.setModelKey('lite')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${
              studio.modelKey === 'lite'
                ? 'bg-gold text-black border-gold'
                : 'border-white/15 text-white/60'
            }`}
            title="Seedance 1.5 Pro"
          >
            Lite ·{' '}
            <CoinPriceLabel
              effective={lite?.priceCoins ?? 10}
              base={lite?.baseCoinsBeforeDiscount ?? 10}
              discounted={discounted}
            />
          </button>
          <button
            type="button"
            onClick={() => studio.setModelKey('fast')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${
              studio.modelKey === 'fast'
                ? 'bg-gold text-black border-gold'
                : 'border-white/15 text-white/60'
            }`}
            title="Seedance 2.0 Fast"
          >
            Fast ·{' '}
            <CoinPriceLabel
              effective={fast?.priceCoins ?? 20}
              base={fast?.baseCoinsBeforeDiscount ?? 20}
              discounted={discounted}
            />
          </button>
          {([6, 8, 10] as const).map((d) => {
            const dp = durationPrices?.[d]
            return (
              <button
                key={d}
                type="button"
                onClick={() => studio.setDuration(d)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-md border ${
                  studio.duration === d
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {d}s · {dp?.priceCoins ?? '—'}
              </button>
            )
          })}
          <select
            value={studio.aspectRatio}
            onChange={(e) => studio.setAspectRatio(e.target.value)}
            className="bg-black border border-white/15 rounded-md px-2 py-1 text-[10px] text-white outline-none"
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
                className={`text-[10px] px-2.5 py-1 rounded-md border ${
                  studio.variations === 1
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                1×
              </button>
              <button
                type="button"
                onClick={() => studio.setVariations(2)}
                className={`text-[10px] px-2.5 py-1 rounded-md border ${
                  studio.variations === 2
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                2×
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => studio.setLookOpen(!studio.lookOpen)}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${
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
            className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-gold/30 text-gold/80 hover:bg-gold hover:text-black transition-colors"
          >
            Save look
          </button>
        </div>

        {studio.presets.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {studio.presets.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => studio.applyPreset(p)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  studio.deletePreset(p.id)
                }}
                className="shrink-0 text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-gold/20 text-gold/70 hover:border-gold/50"
                title="Click to apply · right-click to delete"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {showBreakdown && (
          <p className="text-[10px] text-white/40 font-mono">
            {units} × {perClip} = {price} Coinz
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
                    {buyingId === pkg.id ? 'Redirecting…' : packAdCopy(pkg)}
                  </span>
                  <span className="block text-[9px] opacity-70 mt-0.5">
                    {pkg.amount} Coinz · ${pkg.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {studio.generating ? (
            <button
              type="button"
              onClick={studio.cancelGenerate}
              className="flex-1 py-3 rounded-full border border-red-400/50 text-red-300 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={studio.generate}
              disabled={!studio.canGenerate || !canAfford}
              className="flex-1 py-3 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate · {price} Coinz
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
