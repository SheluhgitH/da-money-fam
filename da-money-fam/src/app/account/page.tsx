'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthProvider'

export default function AccountPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [fanClubActive, setFanClubActive] = useState(false)
  const [fanClubStatus, setFanClubStatus] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

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
  }, [user, authLoading, router])

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
                <Link
                  href="/#reputation"
                  className="block text-center py-2.5 bg-purple-600/40 border border-purple-400/40 text-purple-100 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-purple-600/60"
                >
                  Join Fan Club
                </Link>
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