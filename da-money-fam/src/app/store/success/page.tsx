'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [songTitle, setSongTitle] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [error, setError] = useState('')

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
        setDownloadUrl(data.download_url)
        setStatus('success')

        const link = document.createElement('a')
        link.href = data.download_url
        link.download = ''
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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
            <h1 className="font-serif text-2xl text-white mb-2">Confirming Payment</h1>
            <p className="text-gray-400 text-sm">Preparing your download...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4 text-gold">✓</div>
            <h1 className="font-serif text-2xl text-white mb-2">Payment Successful</h1>
            <p className="text-gray-400 mb-6">
              <span className="text-gold">{songTitle}</span> is downloading to your device.
            </p>
            <a
              href={downloadUrl}
              className="inline-block bg-gold text-black font-bold px-8 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors mb-4"
            >
              Download Again
            </a>
            <p className="text-gray-500 text-xs">
              If the download didn&apos;t start, click the button above.
            </p>
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
