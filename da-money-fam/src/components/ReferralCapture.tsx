'use client'

import { useEffect } from 'react'
import { REFERRAL_COOKIE } from '@/lib/referrals-constants'

export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (!ref) return

    const maxAge = 60 * 60 * 24 * 30
    document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(ref)};path=/;max-age=${maxAge};SameSite=Lax`
  }, [])

  return null
}
