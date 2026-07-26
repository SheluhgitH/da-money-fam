'use client'

import { useEffect } from 'react'

/** Applies a subtle scroll-velocity skew to marked sections.
 *  Disabled on touch devices where it can cause scroll jank near the page bottom. */
export default function ScrollSkewProvider() {
  useEffect(() => {
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window)

    if (isTouchDevice) return

    let lastY = window.scrollY
    let raf = 0
    let skew = 0
    let running = true

    const tick = () => {
      if (!running) return
      const y = window.scrollY
      const velocity = Math.max(-18, Math.min(18, (y - lastY) * 0.35))
      lastY = y
      skew += (velocity - skew) * 0.12
      document.documentElement.style.setProperty('--scroll-skew', `${skew.toFixed(2)}deg`)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.documentElement.style.removeProperty('--scroll-skew')
    }
  }, [])

  return null
}
