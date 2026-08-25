'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function EmailCaptureModal({ hold = false }: { hold?: boolean }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const dismissed = localStorage.getItem('dmf-email-capture')
    if (dismissed === '1' || hold) return
    const timer = window.setTimeout(() => setOpen(true), 18000)
    return () => window.clearTimeout(timer)
  }, [hold])

  const close = () => {
    setOpen(false)
    localStorage.setItem('dmf-email-capture', '1')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to subscribe')
      setStatus('done')
      const packUrl = typeof data.wallpaper_pack_url === 'string' ? data.wallpaper_pack_url : '/wallpapers'
      setMessage('You are in — check your email for the wallpaper pack, or open it now.')
      window.setTimeout(() => {
        close()
        window.location.href = packUrl
      }, 1400)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close email capture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[131] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 glass-gold border border-gold/30 rounded-2xl p-6 md:p-8"
          >
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-3 text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
            <p className="text-gold text-[10px] font-bold tracking-[0.3em] uppercase mb-2">
              Early Access
            </p>
            <h3 className="font-serif text-2xl text-white mb-2">Get early access + exclusive wallpaper</h3>
            <p className="text-gray-400 text-sm mb-5">
              Join the list for drop alerts, stream links, and a DMF wallpaper pack.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-3 bg-black/40 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50"
              />
              <button
                type="submit"
                disabled={status === 'loading' || status === 'done'}
                className="w-full py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full disabled:opacity-60"
              >
                {status === 'loading' ? 'Joining...' : status === 'done' ? 'You are in' : 'Unlock Access'}
              </button>
            </form>
            {message && (
              <p className={`mt-3 text-xs ${status === 'error' ? 'text-red-400' : 'text-gold'}`}>
                {message}
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
