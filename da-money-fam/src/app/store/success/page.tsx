'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackPurchase } from '@/lib/analytics'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [songTitle, setSongTitle] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [isBundle, setIsBundle] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false))
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setError('Missing payment session')
      return
    }

    fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verification failed')
        return data
      })
      .then((data) => {
        setSongTitle(data.song_title)
        setDownloadUrl(data.download_url || '')
        setIsBundle(Boolean(data.is_bundle || data.is_cart))
        setStatus('success')

        if (data.analytics) {
          trackPurchase(data.analytics)
        }

        if (data.download_url) {
          const link = document.createElement('a')
          link.href = data.download_url
          link.download = ''
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      })
      .catch((err) => {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
  }, [sessionId])

  const libraryRedirect = encodeURIComponent('/library')

  return (
    <div className="min-h-screen bg-matte-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-gold rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="loading-spinner mx-auto mb-4" />
            <h1 className="font-serif text-2xl text-white mb-2">Confirming Payment</h1>
            <p className="text-gray-400 text-sm">Preparing your download...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4 text-gold">✓</div>
            <h1 className="font-serif text-2xl text-white mb-2">Payment Successful</h1>
            <p className="text-gray-400 mb-6">
              <span className="text-gold">{songTitle}</span>{' '}
              {isBundle
                ? 'is in your library. Your first track is downloading now.'
                : downloadUrl
                  ? 'is downloading to your device.'
                  : 'purchase is confirmed.'}
            </p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors mb-4"
              >
                {isBundle ? 'Download First Track' : 'Download Again'}
              </a>
            )}
            {isBundle && (
              <Link
                href="/library"
                className="block text-gold text-sm mb-4 hover:underline"
              >
                Open your library for all bundle tracks
              </Link>
            )}
            {downloadUrl && (
              <p className="text-gray-500 text-xs mb-6">
                If the download didn&apos;t start, click the button above.
              </p>
            )}
            {!isLoggedIn && (
              <div className="border-t border-white/10 pt-6 mt-2 mb-6">
                <p className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">
                  Save your purchase
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Create a free account to keep downloads in your library and re-download anytime.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href={`/signup?redirect=${libraryRedirect}`}
                    className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-white transition-colors"
                  >
                    Create Account
                  </Link>
                  <Link
                    href={`/login?redirect=${libraryRedirect}`}
                    className="inline-block border border-gold/40 text-gold font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-gold hover:text-black transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}
            <div className="border-t border-white/10 pt-6 mt-2">
              <p className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">
                Complete the fit
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Rep the movement — shop limited 1-of-1 DMF merch.
              </p>
              <Link
                href="/#merch"
                className="inline-block border border-gold/40 text-gold font-bold px-8 py-3 rounded-full uppercase tracking-wider text-xs hover:bg-gold hover:text-black transition-colors"
              >
                Shop Merch
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">!</div>
            <h1 className="font-serif text-2xl text-white mb-2">Something Went Wrong</h1>
            <p className="text-red-400 text-sm mb-6">{error}</p>
            <Link
              href="/#store"
              className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors"
            >
              Back to Store
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function StoreSuccessPage() {
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
