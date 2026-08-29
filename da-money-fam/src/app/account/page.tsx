'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthProvider'

import { trackFanClubCta } from '@/lib/analytics'

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  )
}

function AccountPageContent() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [checkoutSuccess, setCheckoutSuccess] = useState<'fan_club' | 'coinz' | null>(null)
  const [saving, setSaving] = useState(false)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [fanClubStatus, setFanClubStatus] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [cosmetics, setCosmetics] = useState<
    Array<{
      cosmetic_slug: string
      enabled: boolean
      label: string
      description: string
    }>
  >([])
  const [cosmeticBusy, setCosmeticBusy] = useState<string | null>(null)

  const loadCosmetics = () => {
    fetch('/api/user/cosmetics')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCosmetics(Array.isArray(data?.cosmetics) ? data.cosmetics : [])
      })
      .catch(() => setCosmetics([]))
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?redirect=/account')
      return
    }

    fetch('/api/user/profile')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setEmail(data.email || user.email || '')
        if (data.profile) {
          setDisplayName(data.profile.display_name || '')
          setAvatarUrl(data.profile.avatar_url || '')
        }
      })
      .catch(console.error)

    fetch('/api/user/fan-club')
      .then((r) => r.json())
      .then((data) => {
        setFanClubActive(Boolean(data.active))
        setFanClubStatus(data.subscription?.status ?? null)
      })
      .catch(() => {
        setFanClubActive(false)
        setFanClubStatus(null)
      })

    loadCosmetics()
  }, [user, authLoading, router])

  useEffect(() => {
    if (searchParams.get('fan_club') === 'success') {
      setCheckoutSuccess('fan_club')
      setFanClubActive(true)
      setFanClubStatus('active')
    } else if (searchParams.get('status') === 'success') {
      setCheckoutSuccess('coinz')
    }

    if (searchParams.get('fan_club') || searchParams.get('status')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('fan_club')
      url.searchParams.delete('status')
      const query = url.searchParams.toString()
      window.history.replaceState({}, '', `${url.pathname}${query ? `?${query}` : ''}`)
    }
  }, [searchParams])

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open portal')
      window.location.href = data.url
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to open billing portal')
      setPortalLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl }),
    })

    if (res.ok) {
      setMessage('Profile updated!')
      window.dispatchEvent(new Event('dmf-profile-updated'))
    } else {
      setMessage('Failed to update profile')
    }
    setSaving(false)
  }

  const toggleCosmetic = async (slug: string, enabled: boolean) => {
    setCosmeticBusy(slug)
    try {
      const res = await fetch('/api/user/cosmetics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, enabled }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update flair')
      }
      setCosmetics((prev) =>
        prev.map((c) => (c.cosmetic_slug === slug ? { ...c, enabled } : c))
      )
      window.dispatchEvent(new Event('dmf-profile-updated'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update flair')
    } finally {
      setCosmeticBusy(null)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-matte-black py-24 px-4">
      <div className="max-w-lg mx-auto glass-gold rounded-2xl p-8">
        <h1 className="font-serif text-3xl gold-gradient mb-2">Your Account</h1>
        <p className="text-gray-400 text-sm mb-8">Manage your profile and preferences</p>

        {checkoutSuccess === 'fan_club' && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-center">
            <p className="text-gold text-2xl mb-2">✓</p>
            <p className="text-white font-semibold mb-1">Welcome to the Fan Club</p>
            <p className="text-gray-400 text-sm">You now get extended previews and member perks.</p>
          </div>
        )}

        {checkoutSuccess === 'coinz' && (
          <div className="mb-6 p-4 rounded-xl border border-gold/40 bg-gold/10 text-center">
            <p className="text-gold text-2xl mb-2">✓</p>
            <p className="text-white font-semibold mb-1">Coinz Added</p>
            <p className="text-gray-400 text-sm">Your balance has been updated.</p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gold/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-gold text-2xl font-bold">
                {displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full mt-1 bg-black/30 border border-white/5 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Avatar URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full mt-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white"
            />
          </div>

          {message && <p className="text-gold text-sm">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gold text-black font-bold py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 space-y-3">
          <div className="p-4 rounded-xl border border-gold/20 bg-gold/5 mb-4">
            <p className="text-gold text-[10px] font-bold uppercase tracking-wider mb-1">Profile Flair</p>
            {cosmetics.length === 0 ? (
              <p className="text-gray-500 text-sm">No gifted flair yet</p>
            ) : (
              <ul className="space-y-3 mt-3">
                {cosmetics.map((c) => (
                  <li key={c.cosmetic_slug} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.label}</p>
                      <p className="text-gray-500 text-xs truncate">{c.description}</p>
                    </div>
                    <label className="inline-flex relative items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={c.enabled}
                        disabled={cosmeticBusy === c.cosmetic_slug}
                        onChange={(e) => toggleCosmetic(c.cosmetic_slug, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold peer-disabled:opacity-40" />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 rounded-xl border border-purple-400/20 bg-purple-900/10 mb-4">
            <p className="text-purple-200 text-[10px] font-bold uppercase tracking-wider mb-1">DMF Fan Club</p>
            {fanClubActive ? (
              <>
                <p className="text-green-400 text-sm mb-3">Active — 60s previews + member perks</p>
                <button
                  type="button"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-2.5 border border-gold/30 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 disabled:opacity-50"
                >
                  {portalLoading ? 'Opening...' : 'Manage Subscription'}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-3">
                  {fanClubStatus === 'canceled'
                    ? 'Your membership ended. Rejoin for extended previews.'
                    : '$9/mo — 60s previews & member perks'}
                </p>
                <button
                  type="button"
                  disabled={portalLoading}
                  onClick={async () => {
                    trackFanClubCta('account_page')
                    setPortalLoading(true)
                    try {
                      const res = await fetch('/api/checkout/subscribe', { method: 'POST' })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || 'Checkout failed')
                      window.location.href = data.url
                    } catch (err) {
                      setMessage(err instanceof Error ? err.message : 'Checkout failed')
                      setPortalLoading(false)
                    }
                  }}
                  className="w-full py-2.5 bg-purple-600/40 border border-purple-400/40 text-purple-100 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-purple-600/60 disabled:opacity-50"
                >
                  {portalLoading ? 'Redirecting…' : 'Join Fan Club'}
                </button>
              </>
            )}
          </div>
          <Link
            href="/account/profile"
            className="block text-center py-3 border border-gold/30 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            View Profile Dashboard
          </Link>
          <Link
            href="/ad-studio"
            className="block text-center py-3 border border-gold/30 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            Ad Studio
          </Link>
          <Link
            href="/library"
            className="block text-center py-3 border border-gold/30 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            My Library
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 text-gray-400 text-xs uppercase tracking-wider hover:text-red-400 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-gold text-sm hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}