'use client'

import { useEffect } from 'react'

/**
 * After Stripe (or browser back-forward cache), force a fresh document when needed.
 */
export default function CheckoutReturnHandler() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload()
      }
    }

    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return null
}
