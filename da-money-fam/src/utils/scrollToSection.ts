const NAV_OFFSET = 88

export function scrollToSection(sectionId: string, offset = NAV_OFFSET) {
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
