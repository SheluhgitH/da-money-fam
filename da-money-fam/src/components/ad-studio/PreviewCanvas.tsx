'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ASPECT_CLASS } from '@/lib/ad-studio-types'
import type { AdStudioController } from '@/hooks/useAdStudio'

const STEPS = ['Submitting…', 'Rendering…', 'Almost there…', 'Finishing…']

export default function PreviewCanvas({ studio }: { studio: AdStudioController }) {
  const aspectClass = ASPECT_CLASS[studio.aspectRatio] || ASPECT_CLASS['9:16']
  const url = studio.previewUrls[studio.activePreviewIndex] || null
  const stepLabel =
    studio.statusText ||
    (studio.progressStep > 0 ? STEPS[Math.min(STEPS.length - 1, studio.progressStep - 1)] : null)

  const onEnded = () => {
    if (studio.previewUrls.length > 1) {
      const next = (studio.activePreviewIndex + 1) % studio.previewUrls.length
      studio.setActivePreviewIndex(next)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-0 relative">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(ellipse_at_center,_rgba(255,215,0,0.35),_transparent_60%)]" />

      <motion.div
        layout
        className={`relative w-full max-w-md ${aspectClass} max-h-full rounded-2xl overflow-hidden border border-gold/25 bg-black shadow-[0_0_80px_rgba(255,215,0,0.12)]`}
      >
        <div className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay opacity-20 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%2240%22 height=%2240%22 filter=%22url(%23n)%22 opacity=%220.4%22/></svg>')]" />

        <AnimatePresence mode="wait">
          {url ? (
            <motion.video
              key={url}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              src={url}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black relative z-0"
              onEnded={onEnded}
            />
          ) : studio.generating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
            >
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-2 border-gold/20" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-2 rounded-full bg-gradient-to-b from-gold/10 to-transparent" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70 px-6 text-center">
                {stepLabel || 'Creating…'}
              </p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((s) => (
                  <span
                    key={s}
                    className={`h-1 w-6 rounded-full transition-colors ${
                      studio.progressStep >= s ? 'bg-gold' : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900 via-black to-black z-0"
            >
              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="font-serif text-gold text-xl tracking-wide"
              >
                Ad Studio
              </motion.p>
              <p className="text-[11px] text-white/35 uppercase tracking-[0.25em] text-center px-8">
                Describe your vision below
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {studio.previewUrls.length > 1 && (
        <div className="flex gap-2 mt-4 flex-wrap justify-center relative z-10">
          {studio.previewUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => studio.setActivePreviewIndex(i)}
              className={`text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${
                studio.activePreviewIndex === i
                  ? 'bg-gold text-black border-gold'
                  : 'border-gold/25 text-gold/70'
              }`}
            >
              {i === 0 && studio.mode === 'storyboard' && studio.previewUrls.length > 1
                ? 'Cut'
                : studio.mode === 'storyboard' && studio.previewUrls.length > 1
                  ? `Scene ${i}`
                  : `Take ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {studio.queue.length > 0 && (
        <div className="mt-4 w-full max-w-md space-y-1 relative z-10">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gold/40 mb-1">Queue</p>
          {studio.queue.slice(0, 4).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between text-[10px] px-3 py-1.5 rounded-lg border border-white/10 bg-black/40"
            >
              <span className="text-white/70 truncate pr-2">{job.label}</span>
              <span
                className={
                  job.status === 'running'
                    ? 'text-gold'
                    : job.status === 'completed'
                      ? 'text-green-400'
                      : job.status === 'failed'
                        ? 'text-red-300'
                        : 'text-white/40'
                }
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
