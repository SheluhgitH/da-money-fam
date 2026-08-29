'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import { navigateHomepageSection, HOMEPAGE_NAV_EVENT, type HomepageTabId } from '@/lib/homepage-tabs'
import { useMiniCart } from '@/contexts/MiniCartContext'
import Link from 'next/link'

function ctaForTab(tab: HomepageTabId | null): {
  label: string
  action: 'section' | 'link'
  target: string
} {
  switch (tab) {
    case 'music':
      return { label: 'Upgrade Preview', action: 'section', target: 'membership' }
    case 'services':
      return { label: 'Try Ad Studio', action: 'link', target: '/ad-studio' }
    case 'shop':
      return { label: 'Open Bag', action: 'section', target: 'merch' }
    case 'community':
      return { label: 'Join Fan Club', action: 'section', target: 'membership' }
    case 'artists':
      return { label: 'Shop The Drop', action: 'section', target: 'store' }
    default:
      return { label: 'Shop The Drop', action: 'section', target: 'store' }
  }
}

export default function StickyShopBar() {
  const [visible, setVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<HomepageTabId | null>(null)
  const { items, openCart } = useMiniCart()
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dmf-homepage-tab') as HomepageTabId | null
      if (saved) setActiveTab(saved)
    } catch {
      /* ignore */
    }

    const onNav = () => {
      try {
        const saved = sessionStorage.getItem('dmf-homepage-tab') as HomepageTabId | null
        if (saved) setActiveTab(saved)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener(HOMEPAGE_NAV_EVENT, onNav)
    window.addEventListener('dmf-homepage-tab-change', onNav)
    return () => {
      window.removeEventListener(HOMEPAGE_NAV_EVENT, onNav)
      window.removeEventListener('dmf-homepage-tab-change', onNav)
    }
  }, [])

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

  const cta = ctaForTab(activeTab)

  const onPrimary = () => {
    if (cta.action === 'link') return
    if (activeTab === 'shop' && cta.target === 'merch') {
      openCart()
      return
    }
    navigateHomepageSection(cta.target)
  }

  const btnClass =
    'px-4 sm:px-5 py-3 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-wider shadow-[0_10px_40px_rgba(212,175,55,0.35)] hover:bg-white transition-colors max-w-[11rem] truncate'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed z-[95] flex items-center justify-center gap-2 pointer-events-none"
          style={{
            bottom: 'calc(var(--dmf-safe-bottom) + 1.25rem)',
            left: 'var(--dmf-fab-clearance)',
            right: '0.75rem',
          }}
        >
          <div className="pointer-events-auto flex items-center gap-2 max-w-[calc(100vw-1.5rem-var(--dmf-fab-clearance))]">
            {cta.action === 'link' ? (
              <Link href={cta.target} className={btnClass} title={cta.label}>
                {cta.label}
              </Link>
            ) : (
              <button type="button" onClick={onPrimary} className={btnClass} title={cta.label}>
                {cta.label}
              </button>
            )}
            <button
              type="button"
              onClick={openCart}
              className="relative shrink-0 px-4 py-3 rounded-full glass-gold border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider"
            >
              Bag
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
