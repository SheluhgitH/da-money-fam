'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CameraAngle {
    id: string;
    label: string;
    videoSrc: string; // In a real app, these would be different stream sources
    thumbnail: string;
}

const angles: CameraAngle[] = [
    { id: '1', label: 'MAIN STAGE', videoSrc: '/videos/background.mp4', thumbnail: '🎥' },
    { id: '2', label: 'CROWD VIEW', videoSrc: '/videos/background.mp4', thumbnail: '🙌' },
    { id: '3', label: 'SIDE STAGE', videoSrc: '/videos/background.mp4', thumbnail: '🎸' },
    { id: '4', label: 'DRONE CAM', videoSrc: '/videos/background.mp4', thumbnail: '🛸' },
]

export default function InteractiveVideo() {
    const [currentAngle, setCurrentAngle] = useState(angles[0])
    const [isSwitching, setIsSwitching] = useState(false)
    const [time, setTime] = useState<string>('')

    useEffect(() => {
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString([], { hour12: false }))
        }
        updateTime()
        const timer = setInterval(updateTime, 1000)
        return () => clearInterval(timer)
    }, [])

    const handleAngleChange = (angle: CameraAngle) => {
        if (angle.id === currentAngle.id) return
        setIsSwitching(true)
        setTimeout(() => {
            setCurrentAngle(angle)
            setIsSwitching(false)
        }, 500)
    }

    return (
        <section className="relative max-w-7xl mx-auto py-20 px-4">
            <div className="text-center mb-12">
                <span className="text-gold font-mono text-[10px] tracking-[5px] uppercase">[ LIVE DIRECT MODE ]</span>
                <h2 className="text-4xl md:text-6xl font-serif text-white uppercase italic mt-2">
                    Director&apos;s <span className="text-gold">Cut</span>
                </h2>
                <p className="text-zinc-500 text-sm mt-4 uppercase tracking-widest font-bold">Choose your perspective. Control the show.</p>
            </div>

            <div className="relative aspect-video rounded-3xl overflow-hidden border border-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                {/* Main Video Source */}
                <video
                    key={currentAngle.id}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isSwitching ? 'opacity-0' : 'opacity-100'}`}
                >
                    <source src={currentAngle.videoSrc} type="video/mp4" />
                </video>

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                {/* HUD Elements */}
                <div className="absolute top-6 left-6 flex items-center gap-4">
                    <div className="bg-red-600 px-3 py-1 rounded text-[10px] font-bold text-white flex items-center gap-2 animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full" /> REC
                    </div>
                    <div className="text-white/60 font-mono text-[10px] tracking-widest uppercase">CAM {currentAngle.id} {" // "} {currentAngle.label}</div>
                </div>

                <div className="absolute top-6 right-6 font-mono text-gold text-[10px]">
                    {time}
                </div>

                {/* Director Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 pointer-events-auto">
                    {angles.map((angle) => (
                        <button
                            key={angle.id}
                            onClick={() => handleAngleChange(angle)}
                            className={`group relative flex flex-col items-center gap-2 transition-all ${currentAngle.id === angle.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${currentAngle.id === angle.id ? 'border-gold bg-gold/10' : 'border-white/20 bg-white/5'}`}>
                                <span className="text-xl">{angle.thumbnail}</span>
                            </div>
                            <span className="text-[8px] font-bold text-white uppercase tracking-tighter">{angle.label}</span>

                            {currentAngle.id === angle.id && (
                                <motion.div layoutId="activeAngle" className="absolute -bottom-1 w-1 h-1 bg-gold rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Scanlines Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Signal Strength</div>
                    <div className="flex gap-1 h-1 items-end">
                        <div className="w-1 h-full bg-gold" />
                        <div className="w-1 h-[80%] bg-gold" />
                        <div className="w-1 h-[90%] bg-gold" />
                        <div className="w-1 h-[60%] bg-white/20" />
                    </div>
                </div>
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Bitrate</div>
                    <div className="text-xs font-mono text-white">12.4 MBPS</div>
                </div>
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Latency</div>
                    <div className="text-xs font-mono text-white">42 MS</div>
                </div>
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Active Viewers</div>
                    <div className="text-xs font-mono text-white">4,821 LIVE</div>
                </div>
            </div>
        </section>
    )
}
