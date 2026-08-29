'use client'

import { useEffect, useRef } from 'react'
import type { HomepageTabConfig, HomepageTabId } from '@/lib/homepage-tabs'
import { TAB_BAR_STICKY_TOP_CSS } from '@/utils/scrollToSection'

type HomepageTabBarProps = {
  activeTab: HomepageTabId
  onTabChange: (tab: HomepageTabId) => void
  visibleTabs: HomepageTabConfig[]
}

export default function HomepageTabBar({
  activeTab,
  onTabChange,
  visibleTabs,
}: HomepageTabBarProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const btn = activeRef.current
    const list = listRef.current
    if (!btn || !list) return
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeTab])

  if (visibleTabs.length === 0) return null

  return (
    <div
      className="sticky z-[90] glass border-b border-white/10"
      style={{ top: TAB_BAR_STICKY_TOP_CSS }}
    >
      <div className="max-w-7xl mx-auto px-3 md:px-8">
        <div
          ref={listRef}
          role="tablist"
          aria-label="Homepage sections"
          className="flex gap-2 overflow-x-auto snap-x snap-mandatory py-3 scrollbar-none overscroll-x-contain md:justify-center md:flex-wrap md:overflow-visible"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                ref={isActive ? activeRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`homepage-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`snap-center shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-gold text-black font-semibold'
                    : 'bg-white/5 text-gray-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
