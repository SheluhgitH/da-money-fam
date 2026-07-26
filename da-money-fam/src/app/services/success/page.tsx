'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackPurchase } from '@/lib/analytics'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [packageName, setPackageName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setError('Missing payment session')
      return
    }

    fetch(`/api/checkout/verify-service?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verification failed')
        return data
      })
      .then((data) => {
        setPackageName(data.package_name || 'Your project')
        setStatus('success')
        if (data.analytics) {
          trackPurchase(data.analytics)
        }
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
  }, [sessionId])

  return (
    <div className="min-h-screen bg-matte-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-gold rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="loading-spinner mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-white mb-2">Confirming Deposit</h1>
            <p className="text-gray-400 text-sm">Processing your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4 text-gold">✓</div>
            <h1 className="font-serif text-2xl text-white mb-2">Deposit Received</h1>
            <p className="text-gray-400 mb-6">
              Your <span className="text-gold">{packageName}</span> deposit is confirmed. Our team will reach out within 1–2 business days.
            </p>
            <div className="border-t border-white/10 pt-6 mb-6">
              <p className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">
                While you wait
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Grab exclusive tracks or rep the movement with limited merch.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/#store"
                  className="inline-block border border-gold/40 text-gold font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-gold hover:text-black transition-colors"
                >
                  Shop Music
                </Link>
                <Link
                  href="/#merch"
                  className="inline-block border border-gold/40 text-gold font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-gold hover:text-black transition-colors"
                >
                  Shop Merch
                </Link>
              </div>
            </div>
            <Link
              href="/?section=video-editing"
              className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors"
            >
              Back to Services
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">!</div>
            <h1 className="font-serif text-2xl text-white mb-2">Something Went Wrong</h1>
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <Link
              href="/?section=video-editing"
              className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors"
            >
              Back to Services
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function ServicesSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-matte-black flex items-center justify-center">
          <div className="loading-spinner" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
