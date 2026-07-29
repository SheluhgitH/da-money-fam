'use client'

import type { AdStudioController } from '@/hooks/useAdStudio'
import type { AdStudioGeneration } from '@/lib/ad-studio-types'

export default function GenerationLibrary({
  studio,
  onCloseMobile,
}: {
  studio: AdStudioController
  onCloseMobile?: () => void
}) {
  const select = (item: AdStudioGeneration) => {
    studio.selectLibraryItem(item)
    onCloseMobile?.()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gold/15 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/50">Library</p>
          <h2 className="text-sm font-serif text-gold">Your ads</h2>
        </div>
        {onCloseMobile && (
          <button type="button" onClick={onCloseMobile} className="text-white/40 md:hidden">
            Close
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {studio.library.length === 0 ? (
          <p className="text-[11px] text-white/35 p-2 leading-relaxed">
            Generations appear here. Create your first ad with the prompt dock below.
          </p>
        ) : (
          studio.library.map((item) => {
            const thumb = item.video_urls?.[0]
            const active = studio.selectedLibraryId === item.id
            return (
              <div
                key={item.id}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  active ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <button type="button" onClick={() => select(item)} className="w-full text-left">
                  <div className="aspect-video bg-black/60 relative flex items-center justify-center">
                    {thumb ? (
                      <video
                        src={thumb}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-white/30 uppercase tracking-widest">
                        {item.status}
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider bg-black/70 text-gold px-1.5 py-0.5 rounded">
                      {item.mode === 'storyboard' ? 'Story' : 'Single'}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] text-white/80 line-clamp-2">
                      {item.brief || 'Untitled ad'}
                    </p>
                    <p className="text-[9px] text-white/30 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </button>
                <div className="px-2 pb-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => studio.remixFromLibrary(item)}
                    className="flex-1 text-[9px] uppercase tracking-wider py-1 rounded border border-gold/25 text-gold/80 hover:bg-gold hover:text-black transition-colors"
                  >
                    Remix
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
