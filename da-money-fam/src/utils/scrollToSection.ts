export const NAV_OFFSET = 88
export const TAB_BAR_HEIGHT = 52
/** Combined offset for scrolling to sections when the sticky tab bar is present */
export const SECTION_SCROLL_OFFSET = NAV_OFFSET + TAB_BAR_HEIGHT
/**
 * CSS top for sticky tab bar (below fixed nav / promo + Dynamic Island).
 */
export const TAB_BAR_STICKY_TOP_CSS = 'calc(var(--dmf-safe-top) + 5.5rem)'

/** @deprecated Use TAB_BAR_STICKY_TOP_CSS for sticky positioning */
export const TAB_BAR_STICKY_TOP = NAV_OFFSET

/** Runtime scroll offset including safe-area (iPhone 16 Dynamic Island). */
export function getSectionScrollOffset(): number {
  if (typeof window === 'undefined') return SECTION_SCROLL_OFFSET
  const probe = document.createElement('div')
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.height = 'var(--dmf-safe-top)'
  document.body.appendChild(probe)
  const safeTop = probe.getBoundingClientRect().height || 0
  document.body.removeChild(probe)
  return SECTION_SCROLL_OFFSET + safeTop
}

export function scrollToSection(sectionId: string, offset?: number) {
  const element = document.getElementById(sectionId)
  if (!element) {
    window.location.hash = sectionId
    return
  }

  const resolved = offset ?? getSectionScrollOffset()
  const top = element.getBoundingClientRect().top + window.scrollY - resolved

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  })

  window.history.replaceState(null, '', `#${sectionId}`)
}
