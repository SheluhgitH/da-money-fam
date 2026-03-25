'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VaultItem {
    id: string;
    title: string;
    type: 'Track' | 'Video' | 'Merch';
    releaseDate: Date;
    description: string;
    thumbnail: string;
}

const mockVaultItems: VaultItem[] = [
    {
        id: '1',
        title: 'Midnight Heist (Unreleased)',
        type: 'Track',
        releaseDate: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
        description: 'Exclusive first listen to the upcoming single.',
        thumbnail: '🎵'
    },
    {
        id: '2',
        title: 'Studio Sessions: Day 42',
        type: 'Video',
        releaseDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
        description: 'Behind the scenes footage of the creation process.',
        thumbnail: '🎬'
    },
    {
        id: '3',
        title: 'Golden Era Jacket (Prototype)',
        type: 'Merch',
        releaseDate: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours from now
        description: 'Early access to the limited edition prototype.',
        thumbnail: '🧥'
    }
]

export default function TheVault() {
    const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({})
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const updateTimers = () => {
            const newTimeLeft: { [key: string]: string } = {}
            mockVaultItems.forEach(item => {
                const diff = item.releaseDate.getTime() - Date.now()
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                    newTimeLeft[item.id] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                } else {
                    newTimeLeft[item.id] = 'DECRYPTED'
                }
            })
            setTimeLeft(newTimeLeft)
        }

        updateTimers()
        const timer = setInterval(updateTimers, 1000)
        return () => clearInterval(timer)
    }, [])

    if (!mounted) {
        return <div className="bg-zinc-900/60 border border-gold/20 rounded-3xl p-8 backdrop-blur-md min-h-[400px]" />
    }

    return (
        <div className="bg-zinc-900/60 border border-gold/20 rounded-3xl p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-serif text-white uppercase italic">The <span className="text-gold">Vault</span></h3>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">Encrypted Exclusive Drops</p>
                </div>
                <div className="w-10 h-10 border border-gold/50 rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-gold text-lg">🔒</span>
                </div>
            </div>

            <div className="space-y-6">
                {mockVaultItems.map((item) => (
                    <div key={item.id} className="group relative overflow-hidden bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-gold/30 transition-all duration-500">
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-black rounded-xl flex items-center justify-center text-3xl border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                {item.thumbnail}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[8px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                                        {item.type}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-mono">ID: {item.id.padStart(4, '0')}</span>
                                </div>
                                <h4 className="text-white font-bold text-sm tracking-wide uppercase">{item.title}</h4>
                                <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{item.description}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono text-gold mb-1">
                                    {timeLeft[item.id] || '00:00:00'}
                                </div>
                                <div className="text-[8px] text-white/20 uppercase tracking-widest font-bold">Countdown</div>
                            </div>
                        </div>

                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
                            <motion.div
                                className="h-full bg-gold/50"
                                initial={{ width: '0%' }}
                                animate={{ width: timeLeft[item.id] === 'DECRYPTED' ? '100%' : '30%' }}
                                transition={{ duration: 2 }}
                            />
                        </div>

                        {/* Decrypting Overlay */}
                        {timeLeft[item.id] === 'DECRYPTED' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-gold/5 flex items-center justify-center backdrop-blur-[2px]"
                            >
                                <button className="bg-gold text-black text-[10px] font-bold px-6 py-2 rounded-full uppercase tracking-tighter hover:bg-white transition-colors">
                                    Access File
                                </button>
                            </motion.div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-center">
                <button className="text-[10px] text-gold/60 font-mono uppercase tracking-[4px] hover:text-gold transition-colors">
                    View Archive [Archive_v2.0]
                </button>
            </div>
        </div>
    )
}
