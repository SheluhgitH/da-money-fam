'use client'

import { CREATIVE_ROWS } from '@/lib/ad-creative-presets'
import type { AdStudioController } from '@/hooks/useAdStudio'
import { ASSISTANT_OPEN_EVENT } from '@/lib/assistant-visibility'

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

export default function LookDrawer({ studio }: { studio: AdStudioController }) {
  if (!studio.lookOpen) return null

  return (
    <div className="border-t border-gold/15 pt-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gold uppercase tracking-[0.2em] font-bold">Look</p>
        <button
          type="button"
          onClick={() => studio.setLookOpen(false)}
          className="text-white/40 hover:text-gold text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {CREATIVE_ROWS.map((row) => (
          <div key={row.id} className="flex flex-col gap-1.5">
            <span className="text-[10px] text-white/50 uppercase tracking-wider">{row.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {row.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => studio.setCreativeOption(row.id, option.id)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                    studio.creative[row.id] === option.id
                      ? 'bg-gold text-black border-gold'
                      : 'border-gold/20 text-gold/70 hover:border-gold/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-gold/10">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-white/70 uppercase tracking-wider">Enhance prompt</span>
            <span className="text-[10px] text-white/35">
              {studio.pricing?.canEnhance ? 'Fan Club — polish brief with AI' : 'Fan Club only'}
            </span>
          </div>
          {studio.pricing?.canEnhance ? (
            <button
              type="button"
              role="switch"
              aria-checked={studio.enhance}
              onClick={() => studio.setEnhance((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                studio.enhance ? 'bg-gold' : 'bg-white/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  studio.enhance ? 'translate-x-5' : ''
                }`}
              />
            </button>
          ) : (
            <a href="/account" className="text-[10px] text-gold underline uppercase tracking-wider">
              Join Fan Club
            </a>
          )}
        </div>

        {studio.pricing?.canEnhance && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={
                studio.enhancePreviewLoading ||
                (studio.mode === 'single'
                  ? !studio.brief.trim()
                  : !studio.sceneBriefs.every((b) => b.trim()))
              }
              onClick={() => studio.previewEnhance()}
              className="text-[10px] uppercase tracking-wider px-3 py-2 rounded-full border border-gold/40 text-gold hover:bg-gold hover:text-black transition-colors disabled:opacity-40"
            >
              {studio.enhancePreviewLoading ? 'Enhancing…' : 'Preview enhance'}
            </button>
            {studio.enhancePreviewOpen && (studio.basePreview || studio.enhancedPreview) && (
              <div className="grid sm:grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-lg border border-white/10 bg-black/40 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="uppercase tracking-wider text-white/40">Your brief</p>
                    <button
                      type="button"
                      onClick={() => copyText(studio.basePreview || '')}
                      className="text-[8px] uppercase tracking-wider text-gold/70"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={studio.basePreview || ''}
                    onChange={(e) => studio.setBrief(e.target.value)}
                    className="w-full bg-transparent text-white/80 whitespace-pre-wrap outline-none resize-none"
                  />
                </div>
                <div className="rounded-lg border border-gold/25 bg-gold/5 p-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="uppercase tracking-wider text-gold/60">AI prompt</p>
                    <button
                      type="button"
                      onClick={() => copyText(studio.enhancedPreview || '')}
                      className="text-[8px] uppercase tracking-wider text-gold/70"
                    >
                      Copy
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={studio.enhancedPreview || ''}
                    onChange={(e) => studio.setEnhancedPreview(e.target.value)}
                    className="w-full bg-transparent text-gold/90 whitespace-pre-wrap outline-none resize-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
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
                <button
                  type="button"
                  onClick={() => studio.setEnhancePreviewOpen(false)}
                  className="sm:col-span-2 text-[9px] text-white/40 uppercase tracking-wider"
                >
                  Hide preview
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {(
            [
              ['Write my prompt', 'Write a video prompt for this look and character. Give 2 options.'],
              ['Make it 3 scenes', 'Turn this into a 3-scene storyboard. Keep the same character.'],
              ['Keep this character', 'Keep this character consistent. Name them if I have one saved.'],
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
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
