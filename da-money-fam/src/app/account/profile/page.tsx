'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'
import UserAvatar from '@/components/UserAvatar'
import DailyCheckInPrompt from '@/components/DailyCheckInPrompt'
import ReferralHub from '@/components/ReferralHub'
import DisplayNameFlair from '@/components/profile/DisplayNameFlair'
import { XP_PER_LEVEL } from '@/lib/fan-perks'
import type { PublicSong, UserProfile, UserStats } from '@/types/store'

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [email, setEmail] = useState('')
  const [favorites, setFavorites] = useState<PublicSong[]>([])
  const [ownedCount, setOwnedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCosmetics, setActiveCosmetics] = useState<string[]>([])

  const loadStats = () => {
    fetch('/api/user/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stats) setStats(data.stats)
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?redirect=/account/profile')
      return
    }

    setLoading(true)
    setError('')

    Promise.all([
      fetch('/api/user/profile'),
      fetch('/api/user/stats'),
      fetch('/api/favorites'),
      fetch('/api/songs'),
      fetch('/api/library'),
      fetch('/api/user/cosmetics'),
    ])
      .then(async ([profileRes, statsRes, favRes, songsRes, libraryRes, cosmeticsRes]) => {
        if (!profileRes.ok) {
          const body = await profileRes.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load profile')
        }

        const [profileData, statsData, favData, songsData, libraryData, cosmeticsData] = await Promise.all([
          profileRes.json(),
          statsRes.ok ? statsRes.json() : { stats: null },
          favRes.ok ? favRes.json() : { favorites: [] },
          songsRes.ok ? songsRes.json() : { songs: [] },
          libraryRes.ok ? libraryRes.json() : { library: [] },
          cosmeticsRes.ok ? cosmeticsRes.json() : { active: [] },
        ])

        setProfile(profileData.profile || null)
        setEmail(profileData.email || user.email || '')
        setStats(statsData.stats || null)
        const favoriteIds: string[] = favData.favorites || []
        const allSongs: PublicSong[] = songsData.songs || []
        setFavorites(allSongs.filter((s) => favoriteIds.includes(s.id)))
        setOwnedCount((libraryData.library || []).length)
        setActiveCosmetics(Array.isArray(cosmeticsData.active) ? cosmeticsData.active : [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  useEffect(() => {
    const onCheckIn = () => loadStats()
    window.addEventListener('dmf-checkin-updated', onCheckIn)
    return () => window.removeEventListener('dmf-checkin-updated', onCheckIn)
  }, [])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
        Loading profile...
      </div>
    )
  }

  if (!user) return null

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-gold rounded-2xl p-8 text-center space-y-4">
          <p className="text-red-400 text-sm">{error || 'Could not load your profile.'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gold text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
          >
            Try Again
          </button>
          <Link href="/account" className="block text-gold text-sm hover:underline">
            Account Settings
          </Link>
        </div>
      </div>
    )
  }

  const xpProgress = stats ? ((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100 : 0

  return (
    <div className="min-h-screen bg-matte-black py-24 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-gold rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <UserAvatar
              avatarUrl={profile.avatar_url}
              displayName={profile.display_name}
              email={email}
              size="lg"
            />
            <div className="text-center sm:text-left flex-1">
              <p className="text-gold text-xs uppercase tracking-[4px] mb-2">DMF Fan Profile</p>
              <h1 className="font-serif text-3xl md:text-4xl gold-gradient mb-1 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <DisplayNameFlair
                  name={profile.display_name || 'Fan'}
                  cosmetics={activeCosmetics}
                  size="lg"
                  nameClassName="font-serif text-3xl md:text-4xl gold-gradient"
                />
                {stats && stats.level >= 2 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40 px-2.5 py-1 rounded-full">
                    Fam Regular
                  </span>
                )}
              </h1>
              <p className="text-gray-400 text-sm">{email}</p>
            </div>
            <Link
              href="/account"
              className="px-5 py-2 border border-gold/40 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold hover:text-black transition-colors"
            >
              Edit Profile
            </Link>
          </div>

          {stats && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                <p className="text-gold text-2xl font-bold">{stats.level}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Level</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                <p className="text-gold text-2xl font-bold">{Math.floor(stats.xp)}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">XP</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                <p className="text-gold text-2xl font-bold">{stats.streak}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Streak</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-center border border-white/5">
                <p className="text-gold text-2xl font-bold">{ownedCount}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Owned</p>
              </div>
            </div>
          )}

          {stats && (
            <div className="mt-6">
              <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase mb-2">
                <span>Reputation Progress</span>
                <span>{Math.floor(stats.xp)} XP</span>
              </div>
              <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <DailyCheckInPrompt variant="compact" />
          <ReferralHub />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 sm:p-8 border border-white/10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-white">Favorite Tracks</h2>
            <Link href="/#store" className="text-gold text-xs uppercase tracking-wider hover:underline">
              Browse Store
            </Link>
          </div>

          {favorites.length === 0 ? (
            <p className="text-gray-500 text-sm">No favorites yet. Heart a track in the store to save it here.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.map((song) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 bg-black/30 rounded-xl p-3 border border-white/5 hover:border-gold/30 transition-colors"
                >
                  <img
                    src={song.album_cover_path}
                    alt={song.title}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{song.title}</p>
                    <p className="text-gold text-xs uppercase tracking-wider">{song.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/#vault"
            className="px-6 py-3 border border-gold/40 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            The Vault
          </Link>
          <Link
            href="/library"
            className="px-6 py-3 bg-gold text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
          >
            My Library
          </Link>
          <Link
            href="/coin-wallet"
            className="px-6 py-3 border border-gold/40 text-gold rounded-full text-xs font-bold uppercase tracking-wider hover:bg-gold/10 transition-colors"
          >
            Coin Wallet
          </Link>
          <Link href="/" className="px-6 py-3 text-gray-400 text-xs uppercase tracking-wider hover:text-white transition-colors">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  )
}
