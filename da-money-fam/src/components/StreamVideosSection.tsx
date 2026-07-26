'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  STREAMS_CONFIG,
  formatRelativeDate,
  formatStreamDuration,
  kickThumbnailSrc,
  type KickVideo,
} from '@/lib/streams'
import { scrollRevealViewport } from '@/lib/motion'
import { scrollToSection } from '@/utils/scrollToSection'

export default function StreamVideosSection() {
  const [videos, setVideos] = useState<KickVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [liveWatchUrl, setLiveWatchUrl] = useState(STREAMS_CONFIG.kickChannelUrl)
  const [brokenThumbs, setBrokenThumbs] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`/api/kick/videos?cachebust=${Date.now()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load streams')
        setVideos(data.videos || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load streams')
      } finally {
        setLoading(false)
      }
    }

    const fetchLiveStatus = async () => {
      try {
        const res = await fetch('/api/kick/live')
        const data = await res.json()
        setIsLive(Boolean(data.live))
        if (data.watchUrl) setLiveWatchUrl(data.watchUrl)
      } catch {
        setIsLive(false)
      }
    }

    fetchVideos()
    fetchLiveStatus()

    const interval = setInterval(() => {
      fetchVideos()
      fetchLiveStatus()
    }, 300000) // Refresh every 5 minutes

    return () => clearInterval(interval)
  }, [])

  const kickstarterHref =
    STREAMS_CONFIG.kickstarterUrl || STREAMS_CONFIG.kickChannelUrl

  return (
    <section id="streams" className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="text-center mb-10 md:mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-gold text-xs font-bold tracking-[5px] uppercase">Live Culture</span>
          {isLive && (
            <a
              href={liveWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-full animate-pulse"
            >
              <span className="w-2 h-2 bg-white rounded-full" />
              Live Now
            </a>
          )}
        </div>
        <h2 className="font-serif text-3xl md:text-5xl gold-gradient mt-3 mb-4">Stream Videos</h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
          Watch Day with DMF and behind-the-scenes IRL streams from Jackpotwrld on Kick.
        </p>
      </motion.div>

      {isLive && (
        <motion.a
          href={liveWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={scrollRevealViewport}
          className="mb-10 md:mb-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-600/15 px-6 py-5 hover:bg-red-600/25 transition-colors"
        >
          <div className="text-center sm:text-left">
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Live on Kick</p>
            <p className="text-white font-serif text-xl">Jackpotwrld is live right now</p>
            <p className="text-gray-400 text-sm mt-1">Tap in for Day with DMF — watch as it happens.</p>
          </div>
          <span className="shrink-0 px-6 py-3 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-full animate-pulse">
            Watch Live →
          </span>
        </motion.a>
      )}

      <motion.a
        href={kickstarterHref}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        transition={{ delay: 0.05 }}
        className="block mb-10 md:mb-12 glass-gold rounded-2xl p-6 md:p-8 border border-gold/30 hover:border-gold/60 transition-colors group"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="text-left">
            <p className="text-gold text-[10px] font-bold tracking-[4px] uppercase mb-2">
              {STREAMS_CONFIG.kickstarterUrl ? 'Kickstarter' : 'Jackpotwrld'}
            </p>
            <h3 className="font-serif text-2xl md:text-3xl text-white group-hover:text-gold transition-colors">
              {STREAMS_CONFIG.kickstarterTitle}
            </h3>
            <p className="text-gray-400 text-sm mt-2 max-w-xl">{STREAMS_CONFIG.kickstarterTagline}</p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {STREAMS_CONFIG.kickstarterUrl ? (
              <span className="px-6 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full group-hover:bg-white transition-colors">
                Back on Kickstarter
              </span>
            ) : (
              <span className="px-6 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full group-hover:bg-white transition-colors">
                Follow Jackpotwrld
              </span>
            )}
            <span className="px-6 py-3 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full">
              Watch on Kick
            </span>
          </div>
        </div>
      </motion.a>

      {loading ? (
        <p className="text-center text-gray-500 text-sm">Loading stream videos...</p>
      ) : error ? (
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <a
            href={STREAMS_CONFIG.kickChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors"
          >
            Watch on Kick
          </a>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-sm">No stream videos yet. Check back after the next stream.</p>
          <a
            href={STREAMS_CONFIG.kickChannelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
          >
            Follow on Kick
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, index) => (
            <motion.a
              key={video.id}
              href={video.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={scrollRevealViewport}
              transition={{ delay: index * 0.08 }}
              className="group block glass rounded-2xl overflow-hidden border border-white/10 hover:border-gold/40 transition-colors"
            >
              <div className="relative aspect-video bg-black/50">
                {video.thumbnail && !brokenThumbs[video.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={kickThumbnailSrc(video.thumbnail)}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={() =>
                      setBrokenThumbs((prev) => ({ ...prev, [video.id]: true }))
                    }
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm bg-gradient-to-br from-zinc-900 to-black">
                    Stream preview
                  </div>
                )}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 text-white text-[10px] font-mono rounded">
                  {formatStreamDuration(video.durationMs)}
                </div>
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/80 text-white text-[10px] rounded">
                  {video.views} views
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center">
                    <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gold text-[10px] font-bold tracking-[2px] uppercase">{video.category}</p>
                <h3 className="text-white font-semibold mt-1 group-hover:text-gold transition-colors line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-gray-500 text-xs mt-2">{formatRelativeDate(video.createdAt)}</p>
              </div>
            </motion.a>
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <button
          type="button"
          onClick={() => scrollToSection('store')}
          className="px-8 py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors"
        >
          Shop The Drop
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('merch')}
          className="px-8 py-3 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors"
        >
          Browse Merch
        </button>
        <a
          href={STREAMS_CONFIG.kickChannelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold text-xs uppercase tracking-wider hover:underline"
        >
          View all on Kick →
        </a>
      </motion.div>
    </section>
  )
}
