'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

export const AD_STUDIO_ONBOARD_KEY = 'dmf-ad-studio-onboard-v2'

const STEPS = [
  {
    title: 'Pick Motion',
    body: 'Guide = identity timing. Lock start = freeze the first frame. Animate A→B = start still → end still. Works on Lite, Mini, and Fast.',
  },
  {
    title: 'Stay consistent',
    body: 'Use Identity Locked, Character lock, Same look, and Save look so face and wardrobe match across clips.',
  },
  {
    title: 'Generate (check Coinz)',
    body: 'Set Start/End badges when locking frames, confirm cost, then Generate. Storyboard chains scenes with continuity.',
  },
]

export default function AdStudioOnboarding({
  forceOpen = false,
  onOpenChange,
}: {
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      onOpenChange?.(true)
      return
    }
    try {
      if (sessionStorage.getItem(AD_STUDIO_ONBOARD_KEY) === '1') {
        onOpenChange?.(false)
        return
      }
      setOpen(true)
      onOpenChange?.(true)
    } catch {
      setOpen(true)
      onOpenChange?.(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen])

  const dismiss = () => {
    setOpen(false)
    onOpenChange?.(false)
    try {
      sessionStorage.setItem(AD_STUDIO_ONBOARD_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  const next = () => {
    if (step >= STEPS.length - 1) {
      dismiss()
      return
    }
    setStep((s) => s + 1)
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[81] flex items-center justify-center box-border"
          style={{
            width: '100vw',
            maxWidth: '100%',
            paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
            paddingTop: 'max(1rem, var(--dmf-safe-top))',
            paddingBottom: 'max(1rem, var(--dmf-safe-bottom))',
          }}
        >
          <button
            type="button"
            aria-label="Close onboarding"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ad-studio-onboard-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-sm mx-auto rounded-2xl border border-gold/30 bg-[#0a0a0a] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            style={{ maxWidth: 'min(24rem, calc(100vw - 2rem))' }}
          >
            <p className="text-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2
              id="ad-studio-onboard-title"
              className="font-serif text-xl text-white mb-2 break-words"
            >
              {STEPS[step].title}
            </h2>
            <p className="text-sm text-white/55 mb-6 leading-relaxed break-words">
              {STEPS[step].body}
            </p>
            <div className="flex gap-1.5 mb-5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-gold' : 'bg-white/10'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 min-w-0 py-2.5 rounded-full border border-white/15 text-white/50 text-[10px] font-bold uppercase tracking-wider"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={next}
                className="flex-1 min-w-0 py-2.5 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-wider"
              >
                {step >= STEPS.length - 1 ? 'Got it' : 'Next'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
