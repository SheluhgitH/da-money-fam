'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { navigateHomepageSection } from '@/lib/homepage-tabs'
import { useMiniCart } from '@/contexts/MiniCartContext'

export default function StickyShopBar() {
  const [visible, setVisible] = useState(false)
  const { items, openCart } = useMiniCart()
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    let lastVisible = visible

    const updateVisibility = () => {
      const shouldShow = window.scrollY > window.innerHeight * 0.7
      if (shouldShow !== lastVisible) {
        lastVisible = shouldShow
        setVisible(shouldShow)
      }
      pendingRef.current = false
    }

    const onScroll = () => {
      if (pendingRef.current) return
      pendingRef.current = true
      rafRef.current = requestAnimationFrame(updateVisibility)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => navigateHomepageSection('store')}
            className="px-5 py-3 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-wider shadow-[0_10px_40px_rgba(212,175,55,0.35)] hover:bg-white transition-colors"
          >
            Shop The Drop
          </button>
          <button
            type="button"
            onClick={openCart}
            className="relative px-4 py-3 rounded-full glass-gold border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider"
          >
            Bag
            {items.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
