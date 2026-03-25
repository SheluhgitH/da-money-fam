'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TheVault from './TheVault'

// --- Types ---
interface Fan {
    id: number;
    name: string;
    score: number;
    level: string;
    avatar: string;
    isLegend?: boolean;
}

interface Achievement {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlocked: boolean;
}

const leaderboard: Fan[] = [
    { id: 1, name: "Diamond_King", score: 15420, level: "Legend", avatar: "👑", isLegend: true },
    { id: 2, name: "DMF_Phantom", score: 12100, level: "PlatinumPlus", avatar: "👻" },
    { id: 3, name: "Gold_Soul", score: 9800, level: "Platinum", avatar: "✨" },
    { id: 4, name: "Street_Racer", score: 8500, level: "GoldPlus", avatar: "🏎️" },
    { id: 5, name: "Family_First", score: 7200, level: "Gold", avatar: "💎" },
]

const initialAchievements: Achievement[] = [
    { id: '1', name: "First Drop", icon: "🔥", description: "Login for the first time", unlocked: true },
    { id: '2', name: "Street Team", icon: "📢", description: "Reach Level 5", unlocked: false },
    { id: '3', name: "Big Spender", icon: "💰", description: "Visit the Merch Store", unlocked: false },
    { id: '4', name: "Global Reach", icon: "🌍", description: "Engage from outside US", unlocked: true },
    { id: '5', name: "The Legend", icon: "🔱", description: "Accumulate 10,000 XP", unlocked: false }
]

export default function FanDashboard() {
    const [xp, setXp] = useState(0)
    const [level, setLevel] = useState(1)
    const [streak, setStreak] = useState(0)
    const [showLevelUp, setShowLevelUp] = useState(false)
    const [isLoggedInToday, setIsLoggedInToday] = useState(false)

    // --- Persistence & Logic ---
    useEffect(() => {
        const savedData = localStorage.getItem('dmf_fan_stats')
        if (savedData) {
            const { xp: sXp, level: sLevel, streak: sStreak, lastLogin } = JSON.parse(savedData)
            setXp(sXp)
            setLevel(sLevel)
            setStreak(sStreak)

            const today = new Date().toDateString()
            if (lastLogin === today) {
                setIsLoggedInToday(true)
            }
        }
    }, [])

    const handleDailyCheckIn = () => {
        if (isLoggedInToday) return

        const newXp = xp + 500 * (1 + streak * 0.1)
        const newLevel = Math.floor(newXp / 2000) + 1
        const newStreak = streak + 1

        if (newLevel > level) {
            setShowLevelUp(true)
            setTimeout(() => setShowLevelUp(false), 3000)
        }

        setXp(newXp)
        setLevel(newLevel)
        setStreak(newStreak)
        setIsLoggedInToday(true)

        localStorage.setItem('dmf_fan_stats', JSON.stringify({
            xp: newXp,
            level: newLevel,
            streak: newStreak,
            lastLogin: new Date().toDateString()
        }))
    }

    return (
        <section id="dashboard" className="relative min-h-screen bg-matte-black py-24 px-4 overflow-hidden">
            {/* Background HUD elements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-gold rounded-full animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-gold/30 rounded-full animate-[spin_20s_linear_infinite]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="text-gold font-mono tracking-[4px] uppercase text-xs"
                        >
                            [ COMMAND CENTER ]
                        </motion.span>
                        <h2 className="text-4xl md:text-6xl font-serif text-white uppercase mt-2">
                            Fan <span className="text-gold italic">Impact</span> Hub
                        </h2>
                    </div>

                    {/* User Profile Card (HUD) */}
                    <div className="flex flex-col gap-4 min-w-[300px]">
                        <div className="bg-zinc-900/40 border border-gold/20 backdrop-blur-xl p-6 rounded-2xl flex items-center gap-6 group hover:border-gold/50 transition-all">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-2 border-gold flex items-center justify-center text-3xl">
                                    🎖️
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-gold text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                    LVL {level}
                                </div>
                            </div>
                            <div className="grow">
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

                        {/* Song Request Selection (HUD style) */}
                        <div className="bg-black/40 border border-white/10 p-4 rounded-xl">
                            <h4 className="text-[10px] text-gold font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                                Song Request Queue
                                <span className="text-white/40 font-mono">LIVE BIDDING</span>
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/5">
                                    <span className="text-[10px] text-white/80 font-bold uppercase">&quot;Notebook&quot;</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gold font-mono">1.5 ETH</span>
                                        <button className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-2 py-1 rounded hover:bg-gold hover:text-black transition-all">BID</button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded border border-white/5">
                                    <span className="text-[10px] text-white/80 font-bold uppercase">&quot;Fool In Here&quot;</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gold font-mono">0.8 ETH</span>
                                        <button className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-2 py-1 rounded hover:bg-gold hover:text-black transition-all">BID</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Geographic Heatmap */}
                    <div className="lg:col-span-2 bg-zinc-900/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-gold rounded-full animate-ping" />
                                Global Activity Live
                            </h3>
                            <span className="text-gold/50 font-mono text-[10px]">COORDINATES: 40.7128° N, 74.0060° W</span>
                        </div>

                        {/* Spinning Gold Hologram Globe */}
                        <div className="relative aspect-video bg-black/20 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.1),transparent_70%)]" />

                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                                className="relative w-64 h-64 md:w-80 md:h-80"
                            >
                                <svg className="w-full h-full text-gold/40" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
                                    {[0, 30, 60, 90, 120, 150].map((r) => (
                                        <ellipse key={r} cx="50" cy="50" rx={48} ry={48 * Math.cos(r * Math.PI / 180)} fill="none" stroke="currentColor" strokeWidth="0.2" className="opacity-40" style={{ transform: `rotate(${r}deg)`, transformOrigin: 'center' }} />
                                    ))}
                                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((y) => (
                                        <circle key={y} cx="50" cy="50" r={48 * Math.sin(y * Math.PI / 180)} fill="none" stroke="currentColor" strokeWidth="0.2" className="opacity-40" />
                                    ))}
                                </svg>

                                <div className="absolute inset-0">
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute top-[30%] left-[40%] w-2 h-2 bg-gold rounded-full shadow-[0_0_15px_#D4AF37]"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0.8, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                                        className="absolute top-[60%] left-[70%] w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_10px_#D4AF37]"
                                    />
                                    <motion.div
                                        animate={{ scale: [1, 2, 1], opacity: [0.4, 0.9, 0.4] }}
                                        transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                                        className="absolute top-[45%] left-[20%] w-2 h-2 bg-gold rounded-full shadow-[0_0_12px_#D4AF37]"
                                    />
                                </div>
                            </motion.div>

                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(212,175,55,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
                            <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                <p className="text-gold/40 font-mono text-[8px] tracking-[5px] uppercase animate-pulse">Holographic Projection Active</p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-4 text-[10px] font-mono py-2 border-b border-white/5">
                                <span className="text-gold">[02:55 AM]</span>
                                <span className="text-white/40">NEW JERSEY:</span>
                                <span className="text-white italic">Anonymous used &quot;Preview Env&quot; feature</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-mono py-2 border-b border-white/5">
                                <span className="text-gold">[02:55 AM]</span>
                                <span className="text-white/40">LONDON:</span>
                                <span className="text-white italic">User_92 unlocked &quot;Early Adopter&quot;</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Leaderboard & Stats */}
                    <div className="flex flex-col gap-8">
                        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8">
                            <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm mb-6">Top Rank Fans</h3>
                            <div className="space-y-4">
                                {leaderboard.map((fan) => (
                                    <div key={fan.id} className="flex items-center justify-between group cursor-default">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-sm ${fan.isLegend ? 'bg-gold/20 border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : ''}`}>
                                                {fan.avatar}
                                            </div>
                                            <div>
                                                <div className={`text-xs font-bold ${fan.isLegend ? 'text-gold' : 'text-white/80'}`}>{fan.name}</div>
                                                <div className="text-[8px] text-white/30 uppercase tracking-[2px]">{fan.level}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-mono text-gold">{fan.score.toLocaleString()}</div>
                                            <div className="text-[8px] text-white/20 uppercase">IMPACT</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Social Impact Mini-Chart */}
                        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden mb-8">
                            <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm mb-4">Viral Reach</h3>
                            <div className="flex gap-2 items-end h-24 mb-4">
                                {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        whileInView={{ height: `${h}%` }}
                                        className="grow bg-gradient-to-t from-gold/10 to-gold/60 rounded-t-sm"
                                    />
                                ))}
                            </div>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest text-center">Traction score +24% this week</p>
                        </div>

                        {/* Integration of The Vault */}
                        <TheVault />
                    </div>
                </div>

                {/* Achievements Row */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
                    {initialAchievements.map((ach) => (
                        <div key={ach.id} className={`p-6 rounded-2xl border transition-all ${ach.unlocked
                            ? 'bg-gold/5 border-gold/40 text-white'
                            : 'bg-zinc-900/40 border-white/5 text-zinc-600 grayscale'
                            }`}>
                            <div className="text-3xl mb-3">{ach.icon}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mb-1">{ach.name}</div>
                            <div className="text-[8px] opacity-60 leading-tight uppercase font-medium">{ach.description}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Level Up Notification */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-gold text-black px-12 py-6 rounded-full shadow-[0_0_50px_rgba(212,175,55,0.8)] text-center">
                            <div className="text-[10px] font-extrabold uppercase tracking-[5px] mb-2">Promotion Unlocked</div>
                            <div className="text-4xl font-serif uppercase italic leading-none">Level {level} Achieved</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}
