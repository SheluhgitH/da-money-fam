'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { scrollRevealViewport } from '@/lib/motion'
import { ASPECT_CLASS, type AdStudioShowcaseItem } from '@/lib/ad-studio-types'
import { useAuth } from '@/contexts/AuthProvider'

function PromoReelVideo({
  src,
  aspectClass,
  delay = 0,
}: {
  src: string
  aspectClass: string
  delay?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const tryPlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.defaultMuted = true
    const playPromise = video.play()
    if (playPromise) {
      playPromise.catch(() => {
        /* autoplay blocked until gesture */
      })
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    video.muted = true
    video.defaultMuted = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', 'true')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryPlay()
        } else {
          video.pause()
        }
      },
      { threshold: 0.25, rootMargin: '40px' }
    )
    observer.observe(container)

    const unlockOnGesture = () => tryPlay()
    document.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true })
    document.addEventListener('click', unlockOnGesture, { once: true })

    return () => {
      observer.disconnect()
      document.removeEventListener('touchstart', unlockOnGesture)
      document.removeEventListener('click', unlockOnGesture)
      video.pause()
    }
  }, [src, tryPlay])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={scrollRevealViewport}
      transition={{ duration: 0.4, delay }}
      role="button"
      tabIndex={0}
      onClick={tryPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          tryPlay()
        }
      }}
      className={`relative shrink-0 w-[42vw] sm:w-48 md:w-56 min-h-[220px] snap-center overflow-hidden rounded-2xl border border-gold/20 bg-black ${aspectClass}`}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
    </motion.div>
  )
}

export default function AdStudioPromoSection() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState<AdStudioShowcaseItem[]>([])
  const [fetched, setFetched] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/video/showcase')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setItems(data.items || [])
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setFetched(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || items.length < 2) return

    let frame = 0
    let paused = false
    const onEnter = () => {
      paused = true
    }
    const onLeave = () => {
      paused = false
    }
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)

    const tick = () => {
      if (!paused && el.scrollWidth > el.clientWidth) {
        el.scrollLeft += 0.45
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          el.scrollLeft = 0
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [items])

  const ctaHref = !loading && !user ? '/login?redirect=/ad-studio' : '/ad-studio'

  return (
    <section id="ad-studio-promo" className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        transition={{ duration: 0.55 }}
        className="text-center mb-8 md:mb-10"
      >
        <p className="text-gold text-xs font-bold tracking-[0.35em] uppercase mb-3">Ad Studio</p>
        <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
          Ads made by the Fam
        </h2>
        <p className="text-gray-400 text-sm md:text-base mt-3 max-w-xl mx-auto">
          Latest clips from Seedance — make yours in Coinz, Lite from 5.
        </p>
        <Link
          href={ctaHref}
          className="inline-flex mt-6 px-7 py-3 bg-gold text-black text-xs font-bold uppercase tracking-[0.2em] rounded-full hover:bg-white transition-colors"
        >
          Open Ad Studio
        </Link>
      </motion.div>

      {fetched && items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={scrollRevealViewport}
          className="text-center py-8 border border-gold/15 rounded-2xl bg-white/[0.02]"
        >
          <p className="text-white/45 text-sm mb-4">Be first on the reel.</p>
          <Link
            href={ctaHref}
            className="text-gold text-xs uppercase tracking-widest hover:text-white transition-colors"
          >
            Generate an ad →
          </Link>
        </motion.div>
      ) : items.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={scrollRevealViewport}
          transition={{ duration: 0.5, delay: 0.08 }}
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((item, index) => (
            <PromoReelVideo
              key={item.id}
              src={item.videoUrl}
              aspectClass={ASPECT_CLASS[item.aspect_ratio] || ASPECT_CLASS['9:16']}
              delay={Math.min(index * 0.05, 0.3)}
            />
          ))}
        </motion.div>
      ) : null}
    </section>
  )
}
