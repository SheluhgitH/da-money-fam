'use client'

import { IMAGE_MODELS, IMAGE_TIERS } from '@/lib/image-models'
import type { ImageStudioController } from '@/hooks/useImageStudio'

export default function ImageStudioPanel({
  images,
  onUseForVideo,
}: {
  images: ImageStudioController
  onUseForVideo?: (url: string) => void
}) {
  const price = images.quote?.priceCoins ?? IMAGE_MODELS[images.tier].baseCoins

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 flex items-center justify-center p-4 relative min-h-0">
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

      <div className="shrink-0 border-t border-gold/15 bg-black/80 p-4 space-y-3">
        {images.error && <p className="text-xs text-red-300">{images.error}</p>}

        <div className="flex flex-wrap gap-2">
          {IMAGE_TIERS.map((t) => {
            const tp = images.quote?.tierPrices?.[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  images.setTier(t)
                  if (t === 'edit' || t === 'smart') images.setMode('edit')
                  else images.setMode('generate')
                }}
                className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                  images.tier === t
                    ? 'bg-gold text-black border-gold'
                    : 'border-white/15 text-white/60'
                }`}
              >
                {IMAGE_MODELS[t].label} · {tp?.priceCoins ?? IMAGE_MODELS[t].baseCoins}
              </button>
            )
          })}
          <select
            value={images.aspectRatio}
            onChange={(e) => images.setAspectRatio(e.target.value)}
            className="bg-black border border-white/15 rounded-md px-2 py-1 text-[10px] text-white outline-none"
          >
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
          </select>
        </div>

        <textarea
          rows={2}
          value={images.prompt}
          onChange={(e) => images.setPrompt(e.target.value)}
          placeholder={images.mode === 'edit' ? 'Describe the edit…' : 'Describe the image…'}
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white text-sm outline-none focus:border-gold resize-none"
        />

        <div className="flex flex-wrap items-center gap-2">
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
            className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/25 text-gold/80"
          >
            + Refs
          </button>
          {images.references.map((url, i) => (
            <div
              key={url}
              className="relative w-10 h-10 rounded overflow-hidden border border-gold/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => images.removeReference(i)}
                className="absolute top-0 right-0 w-4 h-4 bg-black/80 text-white text-[9px]"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={images.generating || !images.prompt.trim()}
            onClick={() => images.generate()}
            className="ml-auto px-5 py-2 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40"
          >
            {images.generating ? 'Working…' : `Generate · ${price}c`}
          </button>
        </div>

        {images.previewUrl && onUseForVideo && (
          <button
            type="button"
            onClick={() => onUseForVideo(images.previewUrl!)}
            className="text-[10px] uppercase tracking-wider text-gold underline"
          >
            Use for video ad
          </button>
        )}

        {images.quote && (
          <p className="text-[10px] text-white/35 font-mono">
            Balance {images.quote.balance}c
            {images.quote.tierOrFanClub ? ` · ${images.quote.tierOrFanClub}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
