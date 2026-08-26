'use client'

import { MAX_STORYBOARD_SCENES, MIN_STORYBOARD_SCENES } from '@/lib/ad-studio-types'
import type { AdStudioController } from '@/hooks/useAdStudio'

export default function StoryboardTimeline({ studio }: { studio: AdStudioController }) {
  if (studio.mode !== 'storyboard') return null

  const counts = Array.from(
    { length: MAX_STORYBOARD_SCENES - MIN_STORYBOARD_SCENES + 1 },
    (_, i) => MIN_STORYBOARD_SCENES + i
  )

  return (
    <div className="px-0 pb-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gold/50">Scenes</p>
        <div className="flex gap-1">
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => studio.setSceneCount(n)}
              className={`text-[9px] px-2 py-0.5 rounded-full border ${
                studio.sceneBriefs.length === n
                  ? 'bg-gold text-black border-gold'
                  : 'border-gold/25 text-gold/70'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 studio-scroll flex-nowrap">
        {studio.sceneBriefs.map((brief, i) => (
          <div
            key={i}
            className="min-w-[130px] w-[42vw] max-w-[180px] shrink-0 rounded-xl border border-gold/20 bg-black/40 p-2.5"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] uppercase tracking-wider text-gold">Scene {i + 1}</span>
              {studio.previewUrls[i] && (
                <button
                  type="button"
                  onClick={() => studio.setActivePreviewIndex(i)}
                  className="text-[8px] text-white/40 hover:text-gold"
                >
                  Preview
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={brief}
              onChange={(e) => studio.updateSceneBrief(i, e.target.value)}
              placeholder={`What happens in scene ${i + 1}…`}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-gold resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
