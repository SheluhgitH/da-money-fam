'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { STREAMS_CONFIG } from '@/lib/streams'

const DISMISS_KEY = 'dmf-live-popup'
const POLL_MS = 300000
const SHOW_DELAY_MS = 1000

export default function LiveNowPopup({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [watchUrl, setWatchUrl] = useState(STREAMS_CONFIG.kickChannelUrl)

  const dismiss = useCallback(() => {
    setOpen(false)
    onOpenChange?.(false)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [onOpenChange])

  useEffect(() => {
    let showTimer: number | undefined

    const check = async () => {
      let dismissed = false
      try {
        dismissed = sessionStorage.getItem(DISMISS_KEY) === '1'
      } catch {
        dismissed = false
      }
      if (dismissed) return

      try {
        const res = await fetch('/api/kick/live')
        const data = await res.json()
        const live = Boolean(data.live)
        if (data.watchUrl) setWatchUrl(data.watchUrl)
        if (!live) {
          setOpen(false)
          onOpenChange?.(false)
          return
        }
        if (showTimer) window.clearTimeout(showTimer)
        showTimer = window.setTimeout(() => {
          setOpen(true)
          onOpenChange?.(true)
        }, SHOW_DELAY_MS)
      } catch {
        setOpen(false)
        onOpenChange?.(false)
      }
    }

    void check()
    const interval = window.setInterval(() => void check(), POLL_MS)
    return () => {
      window.clearInterval(interval)
      if (showTimer) window.clearTimeout(showTimer)
    }
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, dismiss])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Dismiss live popup"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={dismiss}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-now-title"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="relative w-full max-w-lg rounded-2xl border border-red-500/40 bg-[#1a0808] px-6 py-6 shadow-[0_0_60px_rgba(220,38,38,0.2)]"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 text-white/50 hover:text-white text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Live on Kick</p>
            <h2 id="live-now-title" className="text-white font-serif text-2xl md:text-3xl pr-6">
              Jackpotwrld is live right now
            </h2>
            <p className="text-gray-400 text-sm mt-2 mb-5">Tap in for Day with DMF — watch as it happens.</p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-full animate-pulse hover:bg-red-500"
            >
              Watch Live →
            </a>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
