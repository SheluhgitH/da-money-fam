'use client'

import Link from 'next/link'
import { PREVIEW_DURATION_SEC, FAN_CLUB_PREVIEW_DURATION_SEC } from '@/lib/audio-constants'
import { navigateHomepageSection } from '@/lib/homepage-tabs'
import { trackFanClubCta } from '@/lib/analytics'

export default function StoreValueStrip() {
  return (
    <div className="max-w-5xl mx-auto mb-6 md:mb-8 px-1">
      <div className="rounded-2xl border border-gold/25 bg-gold/5 px-4 py-3 md:px-6 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-gold text-[10px] font-bold uppercase tracking-[0.25em] mb-1">
            How listening works
          </p>
          <p className="text-white/80 text-sm leading-snug">
            <span className="text-white font-medium">{PREVIEW_DURATION_SEC}s free</span>
            {' → '}
            <span className="text-gold font-medium">Fan Club {FAN_CLUB_PREVIEW_DURATION_SEC}s</span>
            {' → '}
            <span className="text-white font-medium">Buy full track</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              trackFanClubCta('store_value_strip')
              navigateHomepageSection('membership')
            }}
            className="flex-1 sm:flex-none min-w-0 px-4 py-2 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-colors text-center"
          >
            Join Fan Club
          </button>
          <Link
            href="/ad-studio"
            className="flex-1 sm:flex-none min-w-0 px-4 py-2 rounded-full border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors text-center"
          >
            Make a video
          </Link>
        </div>
      </div>
    </div>
  )
}
