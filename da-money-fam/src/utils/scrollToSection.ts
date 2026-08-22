export const NAV_OFFSET = 88
export const TAB_BAR_HEIGHT = 52
/** Combined offset for scrolling to sections when the sticky tab bar is present */
export const SECTION_SCROLL_OFFSET = NAV_OFFSET + TAB_BAR_HEIGHT
/** CSS top for sticky tab bar (below fixed nav / promo) */
export const TAB_BAR_STICKY_TOP = NAV_OFFSET

export function scrollToSection(sectionId: string, offset = SECTION_SCROLL_OFFSET) {
  const element = document.getElementById(sectionId)
  if (!element) {
    window.location.hash = sectionId
    return
  }

  const top = element.getBoundingClientRect().top + window.scrollY - offset

  window.scrollTo({
    top: Math.max(0, top),
    behavior: 'smooth',
  })

  window.history.replaceState(null, '', `#${sectionId}`)
}
