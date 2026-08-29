'use client'

import { useEffect, useRef } from 'react'
import { IMAGE_MODELS, IMAGE_TIERS } from '@/lib/image-models'
import { LEGACY_IMAGE_BASE } from '@/lib/ad-studio-legacy-prices'
import {
  characterRandomizeFacePrompt,
  characterRemixLookPrompt,
} from '@/lib/character-styles'
import { EDIT_LOCK_CHIPS } from '@/lib/image-edit-prompt'
import type { ImageStudioController } from '@/hooks/useImageStudio'
import CoinzPriceCut from './CoinzPriceCut'
import InpaintCanvas from './InpaintCanvas'
import StudioTemplateChips from './StudioTemplateChips'

export default function ImageStudioPanel({
  images,
  onUseForVideo,
  onMakeStoryboard,
}: {
  images: ImageStudioController
  onUseForVideo?: (url: string) => void
  onMakeStoryboard?: (url: string) => void
}) {
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const price = images.quote?.priceCoins ?? IMAGE_MODELS[images.tier].baseCoins
  const legacyPrice = LEGACY_IMAGE_BASE[images.tier]
  const canEdit = images.references.length > 0 || Boolean(images.previewUrl)
  const editMode = images.mode === 'edit' || images.tier === 'edit' || images.tier === 'smart'

  useEffect(() => {
    if (editMode && canEdit) promptRef.current?.focus()
  }, [editMode, canEdit, images.references[0]])

  const runPreset = (kind: 'remix' | 'face') => {
    if (!canEdit || images.generating) return
    const extra = images.prompt
    const text =
      kind === 'face'
        ? characterRandomizeFacePrompt({ name: 'subject', extra })
        : characterRemixLookPrompt({ name: 'subject', extra })
    const useTier = images.tier === 'smart' ? 'smart' : 'edit'
    void images.generate(text, { tier: useTier, mode: 'edit' })
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.35),_transparent_60%)]" />
            {images.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images.previewUrl}
                alt=""
                className="max-h-full max-w-full object-contain relative z-0"
              />
            ) : images.generating ? (
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">Creating image…</p>
            ) : (
              <div className="text-center space-y-2">
                <p className="font-serif text-gold text-xl">Image Studio</p>
                <p className="text-[11px] text-white/35 uppercase tracking-[0.2em]">
                  Generate or edit stills for your ads
                </p>
              </div>
            )}
          </div>
      </div>

      <div className="shrink-0 border-t border-gold/15 bg-black/80 p-3 space-y-3 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto studio-scroll flex-nowrap">
          <button
            type="button"
            onClick={() => images.resetJob()}
            className="shrink-0 text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border border-white/15 text-white/60"
          >
            New
          </button>
          {IMAGE_TIERS.map((t) => {
            const tp = images.quote?.tierPrices?.[t]
            const current = tp?.priceCoins ?? IMAGE_MODELS[t].baseCoins
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  images.setTier(t)
                  if (t === 'edit' || t === 'smart') images.setMode('edit')
                  else images.setMode('generate')
                }}
                className={`shrink-0 text-[10px] uppercase tracking-wider px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  images.tier === t
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {IMAGE_MODELS[t].label} ·{' '}
                <CoinzPriceCut current={current} legacy={LEGACY_IMAGE_BASE[t]} />
              </button>
            )
          })}
          <select
            value={images.aspectRatio}
            onChange={(e) => images.setAspectRatio(e.target.value)}
            className="shrink-0 bg-black border border-white/15 rounded-md px-2 py-1.5 min-h-[28px] text-[10px] text-white outline-none"
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </div>
        {images.error && <p className="text-xs text-red-300">{images.error}</p>}

        <StudioTemplateChips onPick={(t) => images.setPrompt(t.still)} />

        <textarea
          ref={promptRef}
          rows={2}
          value={images.prompt}
          onChange={(e) => images.setPrompt(e.target.value)}
          placeholder={
            canEdit
              ? 'Optional — Generate from the still, pick a shot, or describe an edit…'
              : 'Describe the image, or add a still…'
          }
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white text-sm outline-none focus:border-gold resize-none"
        />

        {canEdit && (
          <div className="flex gap-2 overflow-x-auto studio-scroll flex-nowrap">
            {(['subtle', 'medium', 'heavy'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => images.setEditStrength(s)}
                className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1.5 min-h-[28px] rounded-full border ${
                  images.editStrength === s
                    ? 'border-gold text-gold'
                    : 'border-white/15 text-white/50'
                }`}
              >
                {s}
              </button>
            ))}
            {images.previewUrl && (
              <button
                type="button"
                onClick={() => images.setPaintOpen(!images.paintOpen)}
                className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1.5 min-h-[28px] rounded-full border ${
                  images.paintOpen ? 'border-gold text-gold' : 'border-white/15 text-white/50'
                }`}
              >
                Paint
              </button>
            )}
            {EDIT_LOCK_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() =>
                  images.setPrompt(
                    images.prompt.trim() ? `${chip.extra} ${images.prompt.trim()}` : chip.extra
                  )
                }
                className="shrink-0 text-[9px] uppercase tracking-wider px-2 py-1.5 min-h-[28px] rounded-full border border-white/15 text-white/60"
              >
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              disabled={images.generating}
              onClick={() => runPreset('remix')}
              className="shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold text-gold disabled:opacity-40"
            >
              Remix look
            </button>
            <button
              type="button"
              disabled={images.generating}
              onClick={() => runPreset('face')}
              className="shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold/40 text-gold/90 disabled:opacity-40"
            >
              Randomize face
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto studio-scroll flex-nowrap">
          <input
            ref={images.fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              images.addReferenceFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => images.fileRef.current?.click()}
            className="shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold/25 text-gold/80"
          >
            + Refs
          </button>
          {images.references.map((url, i) => (
            <div
              key={url}
              className="relative w-10 h-10 shrink-0 rounded overflow-hidden border border-gold/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => images.removeReference(i)}
                className="absolute top-0 right-0 w-5 h-5 bg-black/80 text-white text-[9px]"
              >
                ×
              </button>
            </div>
          ))}
          {images.canEnhance && (
            <button
              type="button"
              disabled={images.optimizing || !images.prompt.trim()}
              onClick={() => images.enhancePrompt()}
              className="shrink-0 text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold/40 text-gold/90 disabled:opacity-40"
            >
              Enhance
            </button>
          )}
          {([1, 2, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => images.setStillCount(n)}
              className={`shrink-0 text-[10px] px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                images.stillCount === n
                  ? 'bg-gold text-black border-gold'
                  : 'border-white/15 text-white/60'
              }`}
            >
              {n}×
            </button>
          ))}
        </div>

        {(images.previewUrl && onUseForVideo) || (images.previewUrl && onMakeStoryboard) ? (
          <div className="flex flex-wrap gap-3">
            {images.previewUrl && onUseForVideo && (
              <button
                type="button"
                onClick={() => onUseForVideo(images.previewUrl!)}
                className="text-[10px] uppercase tracking-wider text-gold underline"
              >
                Use for video ad
              </button>
            )}
            {images.previewUrl && onMakeStoryboard && (
              <button
                type="button"
                onClick={() => onMakeStoryboard(images.previewUrl!)}
                className="text-[10px] uppercase tracking-wider text-gold underline"
              >
                Make storyboard
              </button>
            )}
          </div>
        ) : null}

        {images.quote && (
          <p className="text-[10px] text-white/35 font-mono">
            Balance {images.quote.balance}c
            {images.quote.tierOrFanClub ? ` · ${images.quote.tierOrFanClub}` : ''}
          </p>
        )}

        <button
          type="button"
          disabled={images.generating || (!images.prompt.trim() && !canEdit)}
          onClick={() =>
            images.generate(undefined, {
              inpaint: images.paintOpen,
              count: images.stillCount,
            })
          }
          className="w-full py-3 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40"
        >
          {images.generating ? (
            'Working…'
          ) : editMode ? (
            <>
              Apply edit ·{' '}
              <CoinzPriceCut
                current={price * images.stillCount}
                legacy={legacyPrice * images.stillCount}
                suffix="c"
              />
            </>
          ) : (
            <>
              Generate ·{' '}
              <CoinzPriceCut
                current={price * images.stillCount}
                legacy={legacyPrice * images.stillCount}
                suffix="c"
              />
            </>
          )}
        </button>
      </div>

      {images.paintOpen && images.previewUrl ? (
        <div className="absolute inset-1 z-20 flex flex-col min-h-0 rounded-xl border border-gold/25 bg-[#0a0a0a] p-2 shadow-[0_0_80px_rgba(0,0,0,0.85)]">
          <InpaintCanvas
            imageUrl={images.previewUrl}
            aspectRatio={images.aspectRatio}
            onMaskChange={images.setMaskDataUrl}
            onDone={() => images.setPaintOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
