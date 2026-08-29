'use client'

import { CREATIVE_ROWS } from '@/lib/ad-creative-presets'
import type { AdStudioController } from '@/hooks/useAdStudio'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

/** Slim enhance panel — look options live on the hologram Setup ring. */
export default function LookDrawer({ studio }: { studio: AdStudioController }) {
  if (!studio.lookOpen) return null

  return (
    <div className="border-t border-gold/15 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gold uppercase tracking-[0.2em] font-bold">Enhance</p>
        <button
          type="button"
          onClick={() => studio.setLookOpen(false)}
          className="text-white/40 hover:text-gold text-sm"
        >
          Close
        </button>
      </div>
      <p className="text-[10px] text-white/40">
        Look rows ({CREATIVE_ROWS.map((r) => r.label).join(', ')}) are on the Setup hologram —
        hover the summary pill and cycle hubs.
      </p>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70">Enhance prompt</p>
          <p className="text-[9px] text-white/35">
            {studio.pricing?.canEnhance ? 'Fan Club' : 'Fan Club only'}
          </p>
        </div>
        {studio.pricing?.canEnhance ? (
          <button
            type="button"
            role="switch"
            aria-checked={studio.enhance}
            onClick={() => studio.setEnhance((v) => !v)}
            className={`relative w-11 h-6 rounded-full ${studio.enhance ? 'bg-gold' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                studio.enhance ? 'translate-x-5' : ''
              }`}
            />
          </button>
        ) : (
          <a href="/account" className="text-[10px] text-gold underline">
            Join Fan Club
          </a>
        )}
      </div>
      {studio.pricing?.canEnhance && (
        <>
          <button
            type="button"
            disabled={
              studio.enhancePreviewLoading ||
              (studio.mode === 'single'
                ? !studio.brief.trim()
                : !studio.sceneBriefs.every((b) => b.trim()))
            }
            onClick={() => studio.previewEnhance()}
            className="w-full text-[10px] uppercase tracking-wider px-3 py-2 rounded-full border border-gold/40 text-gold disabled:opacity-40"
          >
            {studio.enhancePreviewLoading ? 'Enhancing…' : 'Preview enhance'}
          </button>
          {studio.enhancePreviewOpen && (studio.basePreview || studio.enhancedPreview) && (
            <div className="space-y-2 text-[10px]">
              <textarea
                rows={4}
                value={studio.enhancedPreview || ''}
                onChange={(e) => studio.setEnhancedPreview(e.target.value)}
                className="w-full rounded-lg border border-gold/25 bg-gold/5 p-2 text-gold/90 outline-none resize-none"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => copyText(studio.enhancedPreview || '')}
                  className="text-[8px] uppercase tracking-wider px-2 py-1 rounded-full border border-gold/40 text-gold"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => studio.applyEnhancedAsBrief()}
                  className="text-[8px] uppercase tracking-wider px-2 py-1 rounded-full border border-gold/40 text-gold"
                >
                  Use as brief
                </button>
                <button
                  type="button"
                  onClick={() => studio.splitEnhancedToScenes()}
                  className="text-[8px] uppercase tracking-wider px-2 py-1 rounded-full border border-gold/40 text-gold"
                >
                  Split into scenes
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
