'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AdStudioShell from '@/components/ad-studio/AdStudioShell'

function AdStudioInner() {
  const params = useSearchParams()
  const brief = params.get('brief') || ''
  return <AdStudioShell initialBrief={brief} />
}

export default function AdStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-matte-black flex items-center justify-center text-gold/50 text-sm">
          Loading Ad Studio…
        </div>
      }
    >
      <AdStudioInner />
    </Suspense>
  )
}
