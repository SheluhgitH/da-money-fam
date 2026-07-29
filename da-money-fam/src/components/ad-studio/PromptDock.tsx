'use client'

import { useRef } from 'react'
import type { AdStudioController } from '@/hooks/useAdStudio'
import LookDrawer from './LookDrawer'
import StoryboardTimeline from './StoryboardTimeline'

export default function PromptDock({ studio }: { studio: AdStudioController }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const price = studio.pricing?.totalPriceCoins ?? studio.pricing?.priceCoins ?? 10

  return (
    <div className="border-t border-gold/20 bg-black/90 backdrop-blur-xl">
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
              accept="image/png,image/jpeg,image/webp,image/gif"
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
              accept="image/png,image/jpeg,image/webp,image/gif"
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
            title="Seedance 1.5 Pro · 5 Coinz"
          >
            Lite · 5
          </button>
          <button
            type="button"
            onClick={() => studio.setModelKey('fast')}
            className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${
              studio.modelKey === 'fast'
                ? 'bg-gold text-black border-gold'
                : 'border-white/15 text-white/60'
            }`}
            title="Seedance 2.0 Fast · 10 Coinz"
          >
            Fast · 10
          </button>
          {([6, 8, 10] as const).map((d) => (
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
              {d}s
            </button>
          ))}
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
        </div>

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
              disabled={!studio.canGenerate || !studio.pricing?.canAfford}
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
