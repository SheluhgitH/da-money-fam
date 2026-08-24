'use client'

import { motion } from 'framer-motion'
import type { AdStudioController } from '@/hooks/useAdStudio'
import type { AdStudioGeneration } from '@/lib/ad-studio-types'
import { resolveSeedanceModel } from '@/lib/seedance-models'
import {
  isDurableVideoUrl,
  isImagePosterUrl,
  resolvePlayableVideoUrl,
} from '@/lib/ad-studio-video-urls'

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

  const download = async (item: AdStudioGeneration) => {
    const playable = resolvePlayableVideoUrl(item)
    if (!playable) return
    try {
      const res = await fetch(playable)
      if (!res.ok) {
        window.open(playable, '_blank')
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `dmf-ad-${item.id.slice(0, 8)}.mp4`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(playable, '_blank')
    }
  }

  const copyLink = async (item: AdStudioGeneration) => {
    const durable = item.video_urls?.find(isDurableVideoUrl)
    const share =
      durable || `${window.location.origin}/api/video/showcase/${item.id}/content`
    try {
      await navigator.clipboard.writeText(share)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="shrink-0 p-4 border-b border-gold/15 flex items-center justify-between">
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain studio-scroll">
        {studio.library.length === 0 ? (
          <p className="text-[11px] text-white/35 p-2 leading-relaxed">
            Generations appear here. Create your first ad with the prompt dock below.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
          {studio.library.map((item, index) => {
            const thumb = resolvePlayableVideoUrl(item)
            const poster = isImagePosterUrl(item.thumbnail_url) ? item.thumbnail_url : null
            const active = studio.selectedLibraryId === item.id
            const onSite = item.featured !== false
            const modelLabel = resolveSeedanceModel(item.model).label
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  active ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <button type="button" onClick={() => select(item)} className="w-full text-left">
                  <div className="relative aspect-square overflow-hidden bg-black">
                    {poster && !thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : thumb ? (
                      <video
                        src={thumb}
                        poster={poster || undefined}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/30 uppercase tracking-widest">
                        {item.status}
                      </span>
                    )}
                    <span className="absolute top-1.5 left-1.5 text-[8px] uppercase tracking-wider bg-black/70 text-gold px-1.5 py-0.5 rounded">
                      {item.mode === 'storyboard' ? 'Story' : 'Single'}
                    </span>
                    <span className="absolute top-1.5 right-1.5 text-[8px] uppercase tracking-wider bg-black/70 text-white/70 px-1.5 py-0.5 rounded">
                      {modelLabel}
                    </span>
                    {item.status === 'failed' && (
                      <span className="absolute bottom-1.5 left-1.5 text-[8px] uppercase tracking-wider bg-red-600/90 text-white px-1.5 py-0.5 rounded">
                        Failed
                      </span>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] text-white/80 line-clamp-2">
                      {item.brief || 'Untitled ad'}
                    </p>
                  </div>
                </button>
                <div className="px-1.5 pb-1.5 flex flex-wrap gap-1">
                  {item.status === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => studio.remixFromLibrary(item)}
                      className="flex-1 text-[9px] uppercase tracking-wider py-1 rounded border border-red-400/40 text-red-300"
                    >
                      Retry
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => studio.remixFromLibrary(item)}
                      className="flex-1 text-[9px] uppercase tracking-wider py-1 rounded border border-gold/25 text-gold/80 hover:bg-gold hover:text-black transition-colors"
                    >
                      Remix
                    </button>
                  )}
                  {item.status === 'completed' && item.video_urls?.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => download(item)}
                        className="flex-1 text-[9px] uppercase tracking-wider py-1 rounded border border-white/15 text-white/55 hover:border-gold/40"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(item)}
                        className="text-[9px] uppercase tracking-wider py-1 px-2 rounded border border-white/15 text-white/45"
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(item.admin_hidden)}
                        onClick={() => {
                          if (item.admin_hidden) return
                          studio.setFeatured(item, !onSite)
                        }}
                        className={`flex-1 text-[9px] uppercase tracking-wider py-1 rounded border transition-colors disabled:opacity-40 ${
                          item.admin_hidden
                            ? 'border-white/10 text-white/30'
                            : onSite
                              ? 'border-gold/40 text-gold bg-gold/10'
                              : 'border-white/15 text-white/45'
                        }`}
                      >
                        {item.admin_hidden ? 'Admin hide' : onSite ? 'On site' : 'Hidden'}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
          </div>
        )}
      </div>
    </div>
  )
}
