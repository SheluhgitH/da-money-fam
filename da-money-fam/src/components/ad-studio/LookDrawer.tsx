'use client'

import { CREATIVE_ROWS } from '@/lib/ad-creative-presets'
import type { AdStudioController } from '@/hooks/useAdStudio'

export default function LookDrawer({ studio }: { studio: AdStudioController }) {
  if (!studio.lookOpen) return null

  return (
    <div className="border-t border-gold/15 bg-black/80 p-4 max-h-[40vh] overflow-y-auto">
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
      </div>
    </div>
  )
}
