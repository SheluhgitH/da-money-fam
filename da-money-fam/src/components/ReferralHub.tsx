'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthProvider'

type ReferralSummary = {
  total: number
  rewarded: number
  pending: number
  referrals: Array<{
    id: string
    buyer_email: string
    status: 'pending' | 'rewarded'
    created_at: string
  }>
}

export default function ReferralHub({ className = '' }: { className?: string }) {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const [summary, setSummary] = useState<ReferralSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const inviteUrl =
    typeof window !== 'undefined' && user
      ? `${window.location.origin}/?ref=${encodeURIComponent(user.id)}`
      : user
        ? `/?ref=${encodeURIComponent(user.id)}`
        : ''

  useEffect(() => {
    if (!user) return
    fetch('/api/user/referrals')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const copyLink = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!user) return null

  return (
    <div className={`rounded-2xl border border-gold/20 bg-zinc-900/40 backdrop-blur-xl p-5 sm:p-6 ${className}`}>
      <p className="text-gold text-[10px] font-bold tracking-[0.3em] uppercase mb-1">Invite &amp; Earn</p>
      <h3 className="font-serif text-xl text-white mb-2">Share DMF, earn $1 off</h3>
      <p className="text-gray-400 text-sm mb-4">
        When someone buys through your link, you get a $1 Stripe coupon reward.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          readOnly
          value={inviteUrl}
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-gray-300 truncate"
        />
        <button
          type="button"
          onClick={copyLink}
          className="px-5 py-2.5 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors shrink-0"
        >
          {copied ? 'Copied' : 'Copy Link'}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-xs">Loading referral stats...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gold text-lg font-bold">{summary?.total ?? 0}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Invites</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gold text-lg font-bold">{summary?.rewarded ?? 0}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Rewarded</p>
            </div>
            <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
              <p className="text-gold text-lg font-bold">{summary?.pending ?? 0}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Pending</p>
            </div>
          </div>

          {(summary?.referrals?.length ?? 0) > 0 && (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {summary!.referrals.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between text-xs border border-white/5 rounded-lg px-3 py-2 bg-black/20"
                >
                  <span className="text-gray-400 truncate mr-2">
                    {r.buyer_email.replace(/(.{2}).+(@.+)/, '$1***$2')}
                  </span>
                  <span
                    className={
                      r.status === 'rewarded' ? 'text-green-400 uppercase tracking-wider' : 'text-amber-300 uppercase tracking-wider'
                    }
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
