'use client'

import { MAX_STORYBOARD_SCENES, MIN_STORYBOARD_SCENES } from '@/lib/ad-studio-types'
import type { AdStudioController } from '@/hooks/useAdStudio'

function sceneStatusLabel(
  studio: AdStudioController,
  index: number
): { label: string; tone: 'idle' | 'run' | 'ok' | 'fail' } {
  const statuses = studio.sceneStatuses || []
  const st = statuses[index]
  if (st === 'generating') return { label: 'Generating', tone: 'run' }
  if (st === 'continuity') return { label: 'Continuity', tone: 'run' }
  if (st === 'failed') return { label: 'Failed', tone: 'fail' }
  if (st === 'completed' || studio.previewUrls[index]) return { label: 'Ready', tone: 'ok' }
  if (studio.generating && index === (studio.currentSceneIndex ?? 0)) {
    return { label: 'Queued', tone: 'run' }
  }
  if (studio.generating && index < (studio.currentSceneIndex ?? 0)) {
    return { label: 'Ready', tone: 'ok' }
  }
  return { label: 'Draft', tone: 'idle' }
}

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
        {studio.sceneBriefs.map((brief, i) => {
          const status = sceneStatusLabel(studio, i)
          const toneClass =
            status.tone === 'ok'
              ? 'text-green-400 border-green-500/30 bg-green-500/10'
              : status.tone === 'fail'
                ? 'text-red-300 border-red-500/30 bg-red-500/10'
                : status.tone === 'run'
                  ? 'text-gold border-gold/40 bg-gold/10'
                  : 'text-white/40 border-white/10 bg-white/5'
          return (
            <div
              key={i}
              className="min-w-[130px] w-[min(42vw,160px)] max-w-[180px] shrink-0 rounded-xl border border-gold/20 bg-black/40 p-2.5"
            >
              <div className="flex items-center justify-between mb-1.5 gap-1">
                <span className="text-[9px] uppercase tracking-wider text-gold">Scene {i + 1}</span>
                <span
                  className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${toneClass}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(brief).catch(() => {})
                  }}
                  className="text-[8px] text-white/40 hover:text-gold"
                >
                  Copy
                </button>
                {studio.previewUrls[i] && (
                  <button
                    type="button"
                    onClick={() => studio.setActivePreviewIndex(i)}
                    className="text-[8px] text-white/40 hover:text-gold"
                  >
                    Preview
                  </button>
                )}
                {(status.tone === 'fail' || (status.tone === 'idle' && studio.error)) &&
                  studio.retryStoryboardScene && (
                    <button
                      type="button"
                      onClick={() => studio.retryStoryboardScene?.(i)}
                      className="text-[8px] text-gold hover:text-white"
                    >
                      Retry
                    </button>
                  )}
              </div>
              <textarea
                rows={4}
                value={brief}
                onChange={(e) => studio.updateSceneBrief(i, e.target.value)}
                placeholder={`What happens in scene ${i + 1}…`}
                className="w-full min-h-[4.5rem] bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-gold resize-none"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
