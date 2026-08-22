import type { HomepageSectionConfig, HomepageSectionId } from '@/lib/homepage-sections'

export type HomepageTabId =
  | 'discover'
  | 'music'
  | 'artists'
  | 'shop'
  | 'community'
  | 'services'

export interface HomepageTabConfig {
  id: HomepageTabId
  label: string
  sections: HomepageSectionId[]
}

export const HOMEPAGE_TABS: HomepageTabConfig[] = [
  {
    id: 'discover',
    label: 'Discover',
    sections: ['about', 'collage', 'testimonials'],
  },
  {
    id: 'music',
    label: 'Music',
    sections: ['songs', 'music', 'streams'],
  },
  {
    id: 'artists',
    label: 'Artists',
    sections: ['roster', 'social'],
  },
  {
    id: 'shop',
    label: 'Shop',
    sections: ['merch', 'membership'],
  },
  {
    id: 'community',
    label: 'Community',
    sections: ['perks', 'events', 'blog'],
  },
  {
    id: 'services',
    label: 'Services',
    sections: ['ad-studio', 'pricing-video', 'video-editing', 'hero-video'],
  },
]

export const DEFAULT_HOMEPAGE_TAB: HomepageTabId = 'discover'

/** Nav / URL hashes that don't match a HomepageSectionId 1:1 */
export const HASH_ALIASES: Record<string, string> = {
  home: 'home',
  store: 'store',
  songs: 'store',
  music: 'music',
  artists: 'artists',
  roster: 'artists',
  streams: 'streams',
  merch: 'merch',
  'video-editing': 'video-editing',
  contact: 'contact',
  reputation: 'reputation',
  about: 'about',
  collage: 'collage',
  testimonials: 'testimonials',
  social: 'social',
  membership: 'membership',
  perks: 'reputation',
  events: 'events',
  blog: 'blog',
  'ad-studio': 'ad-studio',
  'pricing-video': 'pricing-video',
  'hero-video': 'hero-video',
}

/** Map a section id or nav hash to the tab that contains it */
const SECTION_TO_TAB: Record<string, HomepageTabId> = {
  about: 'discover',
  collage: 'discover',
  testimonials: 'discover',
  songs: 'music',
  store: 'music',
  music: 'music',
  streams: 'music',
  roster: 'artists',
  artists: 'artists',
  social: 'artists',
  merch: 'shop',
  membership: 'shop',
  perks: 'community',
  reputation: 'community',
  events: 'community',
  blog: 'community',
  'ad-studio': 'services',
  'pricing-video': 'services',
  'video-editing': 'services',
  services: 'services',
  'hero-video': 'services',
}

export function isHomepageTabId(value: string): value is HomepageTabId {
  return HOMEPAGE_TABS.some((t) => t.id === value)
}

export function sectionToTab(sectionOrHash: string): HomepageTabId | null {
  const key = sectionOrHash.replace(/^#/, '').trim().toLowerCase()
  if (!key || key === 'home' || key === 'contact') return null
  return SECTION_TO_TAB[key] ?? null
}

/** Scroll target id for a nav hash (DOM id on the page) */
export function hashToScrollTarget(hash: string): string | null {
  const key = hash.replace(/^#/, '').trim().toLowerCase()
  if (!key || key === 'home') return null
  if (key === 'store' || key === 'songs') return 'store'
  if (key === 'artists' || key === 'roster') return 'artists'
  if (key === 'perks') return 'reputation'
  if (key === 'services') return 'video-editing'
  return key
}

export function getVisibleTabs(
  sections: HomepageSectionConfig[]
): HomepageTabConfig[] {
  const visibleIds = new Set(
    sections.filter((row) => !row.hidden).map((row) => row.id)
  )

  return HOMEPAGE_TABS.filter((tab) =>
    tab.sections.some((id) => visibleIds.has(id))
  ).map((tab) => ({
    ...tab,
    sections: tab.sections.filter((id) => visibleIds.has(id)),
  }))
}

export function getSectionsForTab(
  tabId: HomepageTabId,
  sections: HomepageSectionConfig[]
): HomepageSectionId[] {
  const tab = HOMEPAGE_TABS.find((t) => t.id === tabId)
  if (!tab) return []
  const visibleIds = new Set(
    sections.filter((row) => !row.hidden).map((row) => row.id)
  )
  // Preserve admin section order within the tab
  const orderIndex = new Map(sections.map((row, i) => [row.id, i]))
  return tab.sections
    .filter((id) => visibleIds.has(id))
    .sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0))
}

export function resolveTabFromUrl(params: {
  tabParam?: string | null
  sectionParam?: string | null
  hash?: string | null
}): { tab: HomepageTabId; scrollTarget: string | null } {
  const hash = (params.hash || '').replace(/^#/, '').split('?')[0].trim()
  const sectionParam = params.sectionParam?.trim() || null
  const tabParam = params.tabParam?.trim() || null

  if (tabParam && isHomepageTabId(tabParam)) {
    return { tab: tabParam, scrollTarget: null }
  }

  const fromSection = sectionParam || hash
  if (fromSection) {
    const tab = sectionToTab(fromSection)
    if (tab) {
      return { tab, scrollTarget: hashToScrollTarget(fromSection) }
    }
  }

  return { tab: DEFAULT_HOMEPAGE_TAB, scrollTarget: null }
}

export const HOMEPAGE_NAV_EVENT = 'dmf-homepage-nav'

export type HomepageNavDetail = {
  section: string
}

/** Switch homepage tab (if needed) then scroll — use instead of scrollToSection for cross-tab links */
export function navigateHomepageSection(section: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<HomepageNavDetail>(HOMEPAGE_NAV_EVENT, {
      detail: { section },
    })
  )
}
