'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'
import UserAvatar from '@/components/UserAvatar'
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

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login?redirect=/account/profile')
      return
    }

    Promise.all([
      fetch('/api/user/profile').then((r) => r.json()),
      fetch('/api/user/stats').then((r) => r.json()),
      fetch('/api/favorites').then((r) => r.json()),
      fetch('/api/songs').then((r) => r.json()),
      fetch('/api/library').then((r) => r.json()),
    ])
      .then(([profileData, statsData, favData, songsData, libraryData]) => {
        setProfile(profileData.profile || null)
        setEmail(profileData.email || user.email || '')
        setStats(statsData.stats || null)
        const favoriteIds: string[] = favData.favorites || []
        const allSongs: PublicSong[] = songsData.songs || []
        setFavorites(allSongs.filter((s) => favoriteIds.includes(s.id)))
        setOwnedCount((libraryData.library || []).length)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-matte-black flex items-center justify-center text-gray-500">
        Loading profile...
      </div>
    )
  }

  if (!user || !profile) return null

  const xpProgress = stats ? (stats.xp % 2000) / 20 : 0

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
              <h1 className="font-serif text-3xl md:text-4xl gold-gradient mb-1">
                {profile.display_name || 'Fan'}
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
