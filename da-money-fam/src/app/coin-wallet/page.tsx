'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthProvider'
import { COIN_PACKAGES, packAdCopy } from '@/lib/coin-packages'

export default function CoinWallet() {
  const { user, loading: authLoading } = useAuth()
  const [coinBalance, setCoinBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchCoinBalance = async () => {
    if (!user) {
      setCoinBalance(0)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/user/coins')
      const data = await res.json()
      if (res.ok) {
        setCoinBalance(data.coins)
      } else {
        setError(data.error || 'Failed to fetch coin balance')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coin balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchCoinBalance()
    }
  }, [user, authLoading])

  const handlePurchaseCoins = async (packageId: string) => {
    if (!user) return
    setPurchaseLoadingId(packageId)
    setError('')
    try {
      const res = await fetch('/api/coinz/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId, return_path: '/coin-wallet' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Coin purchase failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coin purchase failed')
      setPurchaseLoadingId(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
        Loading coin wallet...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-matte-black flex flex-col items-center justify-center p-4">
        <p className="text-gray-400 mb-6">Sign in to manage your DMF Coinz.</p>
        <Link
          href="/login?redirect=/coin-wallet"
          className="bg-gold text-black font-bold py-3 px-8 rounded-full uppercase tracking-wider hover:bg-white transition-colors"
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-matte-black py-24 px-4">
      <div className="max-w-xl mx-auto glass-gold rounded-2xl p-8">
        <h1 className="font-serif text-3xl gold-gradient mb-2">My DMF Coinz</h1>
        <p className="text-gray-400 text-sm mb-2">
          Current Balance:{' '}
          <span className="text-gold font-bold text-lg">{coinBalance} Coinz</span>
        </p>
        <p className="text-gray-500 text-xs mb-8">
          Ad Studio: Lite from 10 Coinz · Fast from 20 Coinz (6s). Longer clips cost more.
        </p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          {COIN_PACKAGES.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between glass rounded-lg p-4 gap-3">
              <div className="min-w-0">
                <h3 className="text-white font-bold">
                  {packAdCopy(pkg)}
                </h3>
                <p className="text-gold text-sm font-mono mt-0.5">
                  {pkg.amount} Coinz · ${pkg.price.toFixed(2)}
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{pkg.label}</p>
              </div>
              <button
                onClick={() => handlePurchaseCoins(pkg.id)}
                disabled={purchaseLoadingId === pkg.id}
                className="shrink-0 bg-gold text-black font-bold py-2 px-6 rounded-full uppercase tracking-wider text-xs hover:bg-white transition-colors disabled:opacity-50"
              >
                {purchaseLoadingId === pkg.id ? 'Processing...' : 'Buy Coinz'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center mt-8">
          <Link href="/ad-studio" className="text-gold text-sm hover:underline mr-4">
            Ad Studio
          </Link>
          <Link href="/" className="text-gold text-sm hover:underline">
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}
