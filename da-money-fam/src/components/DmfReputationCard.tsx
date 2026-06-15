import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'

export default function DmfReputationCard() {
    const { user } = useAuth()
    const [xp, setXp] = useState(0)
    const [level, setLevel] = useState(1)
    const [streak, setStreak] = useState(0)
    const [isLoggedInToday, setIsLoggedInToday] = useState(false)

    const applyStats = (sXp: number, sLevel: number, sStreak: number, lastLogin: string | null) => {
        setXp(sXp)
        setLevel(sLevel)
        setStreak(sStreak)
        const today = new Date().toDateString()
        setIsLoggedInToday(lastLogin === today)
    }

    const persistStats = async (sXp: number, sLevel: number, sStreak: number, lastLogin: string) => {
        localStorage.setItem('dmf_fan_stats', JSON.stringify({
            xp: sXp,
            level: sLevel,
            streak: sStreak,
            lastLogin,
        }))

        if (user) {
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
    }

    useEffect(() => {
        if (user) {
            fetch('/api/user/profile')
                .then(async (r) => {
                  const text = await r.text();
                  if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}, body: ${text}`);
                  }
                  return JSON.parse(text);
                })

            fetch('/api/user/stats')
                .then((r) => r.json())
                .then(async (data) => {
                    if (data.stats) {
                        const localRaw = localStorage.getItem('dmf_fan_stats')
                        if (localRaw) {
                            const local = JSON.parse(localRaw)
                            const mergedXp = Math.max(data.stats.xp, local.xp || 0)
                            const mergedLevel = Math.max(data.stats.level, local.level || 1)
                            const mergedStreak = Math.max(data.stats.streak, local.streak || 0)
                            applyStats(mergedXp, mergedLevel, mergedStreak, data.stats.last_login)
                            if (mergedXp > data.stats.xp) {
                                await persistStats(mergedXp, mergedLevel, mergedStreak, data.stats.last_login || '')
                            }
                        } else {
                            applyStats(data.stats.xp, data.stats.level, data.stats.streak, data.stats.last_login)
                        }
                    }
                })
                .catch(console.error)
            return
        }

        const savedData = localStorage.getItem('dmf_fan_stats')
        if (savedData) {
            const { xp: sXp, level: sLevel, streak: sStreak, lastLogin } = JSON.parse(savedData)
            applyStats(sXp, sLevel, sStreak, lastLogin)
        }
    }, [user])

    const handleDailyCheckIn = async () => {
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
            </div>
        </div>
    )
}