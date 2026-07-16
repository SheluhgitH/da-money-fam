import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthProvider'

export default function DmfReputationCard() {
    const { user } = useAuth()
    const [xp, setXp] = useState(0)
    const [level, setLevel] = useState(1)
    const [streak, setStreak] = useState(0)
    const [isLoggedInToday, setIsLoggedInToday] = useState(false)
    const [fanClubActive, setFanClubActive] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [fanClubMessage, setFanClubMessage] = useState('')

    const applyStats = (sXp: number, sLevel: number, sStreak: number, lastLogin: string | null) => {
        setXp(sXp)
        setLevel(sLevel)
        setStreak(sStreak)
        const today = new Date().toDateString()
        setIsLoggedInToday(lastLogin === today)
    }

    const persistStats = async (sXp: number, sLevel: number, sStreak: number, lastLogin: string) => {
        await fetch('/api/user/stats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                xp: sXp,
                level: sLevel,
                streak: sStreak,
                last_login: lastLogin,
                unlock_achievement: '1',
            }),
        })
    }

    useEffect(() => {
        if (!user) return

        fetch('/api/user/stats')
            .then((r) => r.json())
            .then((data) => {
                if (data.stats) {
                    applyStats(data.stats.xp, data.stats.level, data.stats.streak, data.stats.last_login)
                }
            })
            .catch(console.error)

        fetch('/api/user/fan-club')
            .then((r) => r.json())
            .then((data) => setFanClubActive(Boolean(data.active)))
            .catch(() => setFanClubActive(false))
    }, [user])

    const handleJoinFanClub = async () => {
        if (!user || fanClubActive) return
        setSubscribing(true)
        setFanClubMessage('')
        try {
            const res = await fetch('/api/checkout/subscribe', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Checkout failed')
            window.location.href = data.url
        } catch (err) {
            setFanClubMessage(err instanceof Error ? err.message : 'Failed to start checkout')
            setSubscribing(false)
        }
    }

    const handleDailyCheckIn = async () => {
        if (!user) return
        if (isLoggedInToday) return

        const newXp = xp + 500 * (1 + streak * 0.1)
        const newLevel = Math.floor(newXp / 2000) + 1
        const newStreak = streak + 1
        const today = new Date().toDateString()

        setXp(newXp)
        setLevel(newLevel)
        setStreak(newStreak)
        setIsLoggedInToday(true)

        await persistStats(newXp, newLevel, newStreak, today)
    }

    if (!user) {
        return (
            <div className="bg-zinc-900/40 border border-gold/20 backdrop-blur-xl p-6 rounded-2xl text-center max-w-3xl mx-auto">
                <p className="text-gold text-[10px] font-bold tracking-[4px] uppercase mb-2">DMF Reputation</p>
                <h3 className="font-serif text-xl text-white mb-2">Earn XP &amp; Fan Perks</h3>
                <p className="text-gray-400 text-sm mb-4">
                    Sign in to claim daily check-ins, earn XP from purchases &amp; favorites, and unlock Level 3+ store discounts.
                </p>
                <Link
                    href="/login?redirect=/%23store"
                    className="inline-block px-6 py-2.5 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
                >
                    Sign In to Start
                </Link>
            </div>
        )
    }

    return (
        <div className="bg-zinc-900/40 border border-gold/20 backdrop-blur-xl p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group hover:border-gold/50 transition-all max-w-3xl mx-auto">
            <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-gold flex items-center justify-center text-2xl sm:text-3xl">
                    🎖️
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gold text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    LVL {level}
                </div>
            </div>
            <div className="grow w-full text-center sm:text-left">
                <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase mb-1">
                    <span>DMF REPUTATION</span>
                    <span>{Math.floor(xp)} XP</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(xp % 2000) / 20}%` }}
                        className="h-full bg-gradient-to-r from-gold to-gold-light"
                    />
                </div>
                {level >= 3 && (
                    <p className="text-gold text-[10px] mt-2 uppercase tracking-wider">
                        Level {level} perk: 10% off your next track
                    </p>
                )}
                <button
                    onClick={handleDailyCheckIn}
                    disabled={isLoggedInToday}
                    className={`mt-3 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isLoggedInToday
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-gold text-black hover:bg-white'
                        }`}
                >
                    {isLoggedInToday ? `STREAK: ${streak} DAYS` : 'CLAIM DAILY CHECK-IN'}
                </button>
                {fanClubActive ? (
                    <p className="mt-3 text-green-400 text-[10px] uppercase tracking-wider font-bold">
                        Fan Club active — 60s previews unlocked
                    </p>
                ) : (
                    <button
                        type="button"
                        onClick={handleJoinFanClub}
                        disabled={subscribing}
                        className="mt-3 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-purple-600/40 border border-purple-400/40 text-purple-100 hover:bg-purple-600/60 disabled:opacity-50"
                    >
                        {subscribing ? 'Redirecting...' : 'Join Fan Club — $9/mo'}
                    </button>
                )}
                {fanClubMessage && (
                    <p className="mt-2 text-red-400 text-[10px]">{fanClubMessage}</p>
                )}
            </div>
        </div>
    )
}
