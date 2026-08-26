'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export type VoicePhase = 'listening' | 'thinking' | 'speaking' | 'warmup' | 'done' | null

export default function AssistantVoiceOverlay({
  phase,
  transcript,
  answer,
  muted,
  showStudioActions,
  onUseInPrompt,
  onCopy,
  onMuteToggle,
  onClose,
}: {
  phase: VoicePhase
  transcript: string
  answer: string
  muted: boolean
  showStudioActions?: boolean
  onUseInPrompt?: () => void
  onCopy?: () => void
  onMuteToggle: () => void
  onClose: () => void
}) {
  const reduce = useReducedMotion()
  const bars = [0.35, 0.7, 1, 0.55, 0.85, 0.45, 0.9, 0.5]

  const label =
    phase === 'listening'
      ? 'Listening…'
      : phase === 'warmup'
        ? 'Warming up voice…'
        : phase === 'thinking'
          ? 'On it…'
          : phase === 'speaking'
            ? 'Speaking…'
            : phase === 'done'
              ? 'Reply'
              : ''

  return (
    <AnimatePresence>
      {phase && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl" />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-auto w-full max-w-lg rounded-[28px] border border-gold/25 bg-gradient-to-b from-white/8 to-black/50 px-6 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
          >
            <div className="relative mx-auto mb-6 h-36 w-36">
              {!reduce && (phase === 'listening' || phase === 'speaking') && (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-full border border-gold/40"
                    animate={{ scale: [1, 1.4], opacity: [0.55, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <motion.span
                    className="absolute inset-3 rounded-full border border-gold/20"
                    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                    transition={{ duration: 1.9, repeat: Infinity, delay: 0.2 }}
                  />
                </>
              )}
              <motion.div
                className="absolute inset-6 rounded-full"
                style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)' }}
                animate={
                  reduce
                    ? {}
                    : phase === 'thinking' || phase === 'warmup'
                      ? { rotate: 360 }
                      : { scale: [1, 1.07, 1] }
                }
                transition={
                  phase === 'thinking' || phase === 'warmup'
                    ? { duration: 8, repeat: Infinity, ease: 'linear' }
                    : { duration: 2.2, repeat: Infinity }
                }
              />
            </div>
            <div className="mb-4 flex h-12 items-end justify-center gap-1">
              {bars.map((h, i) => (
                <motion.span
                  key={i}
                  className="w-1.5 rounded-full bg-gold"
                  animate={
                    reduce
                      ? { height: 8 }
                      : {
                          height:
                            phase === 'listening' || phase === 'speaking'
                              ? [8, 8 + h * 32, 8]
                              : 10,
                        }
                  }
                  transition={{
                    duration: 0.7 + i * 0.05,
                    repeat: Infinity,
                    delay: i * 0.06,
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-gold">{label}</p>
            {transcript && (
              <p className="mt-4 text-base text-white/85">{transcript}</p>
            )}
            {answer && (
              <p className="mt-4 max-h-40 overflow-y-auto text-left text-[15px] leading-relaxed text-white/80">
                {answer}
              </p>
            )}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {answer && (
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded-full border border-gold/30 px-4 py-2 text-[10px] uppercase tracking-widest text-gold"
                >
                  Copy
                </button>
              )}
              {showStudioActions && answer && (
                <button
                  type="button"
                  onClick={onUseInPrompt}
                  className="rounded-full bg-gold px-4 py-2 text-[10px] uppercase tracking-widest text-black font-bold"
                >
                  Use in prompt
                </button>
              )}
              <button
                type="button"
                onClick={onMuteToggle}
                className="rounded-full border border-gold/30 px-4 py-2 text-[10px] uppercase tracking-widest text-gold"
              >
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/60"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
