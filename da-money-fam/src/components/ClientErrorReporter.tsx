'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Lightweight production error reporter — forwards uncaught errors to GA/Vercel Analytics.
 * Does not replace a full APM (Sentry); safe no-op when analytics is unavailable.
 */
export default function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      trackEvent('client_error', {
        message: String(event.message || 'unknown').slice(0, 200),
        source: String(event.filename || '').slice(0, 120),
      })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'unhandledrejection'
      trackEvent('client_unhandled_rejection', {
        message: String(message).slice(0, 200),
      })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
