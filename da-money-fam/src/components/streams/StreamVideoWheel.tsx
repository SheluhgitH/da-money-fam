'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, type PanInfo } from 'framer-motion'
import {
  formatRelativeDate,
  formatStreamDuration,
  kickThumbnailSrc,
  type KickVideo,
} from '@/lib/streams'

type StreamVideoWheelProps = {
  videos: KickVideo[]
  brokenThumbs: Record<string, boolean>
  onThumbError: (id: string) => void
}

const DRAG_THRESHOLD = 60
const AUTO_ADVANCE_MS = 6000
const MAX_VISIBLE_OFFSET = 2

function wrapIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

function shortestOffset(index: number, active: number, length: number) {
  let raw = index - active
  if (raw > length / 2) raw -= length
  if (raw < -length / 2) raw += length
  return raw
}

function styleForOffset(offset: number, reducedMotion: boolean) {
  const abs = Math.abs(offset)
  if (abs > MAX_VISIBLE_OFFSET) {
    return {
      x: offset * 180,
      scale: 0.55,
      rotateY: 0,
      opacity: 0,
      zIndex: 0,
      pointerEvents: 'none' as const,
    }
  }

  if (reducedMotion) {
    return {
      x: offset * 220,
      scale: offset === 0 ? 1 : 0.88,
      rotateY: 0,
      opacity: offset === 0 ? 1 : 0.45,
      zIndex: 10 - abs,
      pointerEvents: offset === 0 ? ('auto' as const) : ('none' as const),
    }
  }

  const x = offset * 155
  const scale = offset === 0 ? 1 : abs === 1 ? 0.78 : 0.62
  const rotateY = offset === 0 ? 0 : offset < 0 ? 28 : -28
  const opacity = offset === 0 ? 1 : abs === 1 ? 0.72 : 0.35

  return {
    x,
    scale,
    rotateY,
    opacity,
    zIndex: 10 - abs,
    pointerEvents: offset === 0 ? ('auto' as const) : ('none' as const),
  }
}

export default function StreamVideoWheel({
  videos,
  brokenThumbs,
  onThumbError,
}: StreamVideoWheelProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const count = videos.length
  const showNav = count > 1

  const goTo = useCallback(
    (next: number) => {
      setActiveIndex(wrapIndex(next, count))
    },
    [count]
  )

  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo])
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo])

  useEffect(() => {
    setActiveIndex(0)
  }, [videos])

  useEffect(() => {
    if (!showNav || paused || dragging || reducedMotion) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => wrapIndex(i + 1, count))
    }, AUTO_ADVANCE_MS)
    return () => window.clearInterval(id)
  }, [showNav, paused, dragging, reducedMotion, count])

  useEffect(() => {
    const el = stageRef.current
    if (!el || !showNav) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }

    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [showNav, goPrev, goNext])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false)
    if (info.offset.x < -DRAG_THRESHOLD || info.velocity.x < -400) {
      goNext()
    } else if (info.offset.x > DRAG_THRESHOLD || info.velocity.x > 400) {
      goPrev()
    }
  }

  if (count === 0) return null

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Stream videos"
        className="stream-wheel-stage relative h-[380px] md:h-[460px] outline-none select-none"
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          drag={showNav ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragStart={() => setDragging(true)}
          onDragEnd={onDragEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {videos.map((video, index) => {
            const offset = shortestOffset(index, activeIndex, count)
            const style = styleForOffset(offset, Boolean(reducedMotion))
            const isActive = offset === 0

            return (
              <motion.a
                key={video.id}
                href={video.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                className={`stream-wheel-card group absolute w-[min(88vw,340px)] md:w-[400px] glass rounded-2xl overflow-hidden border transition-[box-shadow,border-color] duration-300 ${
                  isActive
                    ? 'border-gold/50 shadow-[0_0_40px_rgba(212,175,55,0.25)]'
                    : 'border-white/10'
                }`}
                initial={false}
                animate={{
                  x: style.x,
                  scale: style.scale,
                  rotateY: style.rotateY,
                  opacity: style.opacity,
                  zIndex: style.zIndex,
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                style={{
                  pointerEvents: style.pointerEvents,
                  transformPerspective: 1200,
                }}
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault()
                    goTo(index)
                  }
                }}
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
                      draggable={false}
                      onError={() => onThumbError(video.id)}
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
                  <p className="text-gold text-[10px] font-bold tracking-[2px] uppercase">
                    {video.category}
                  </p>
                  <h3 className="text-white font-semibold mt-1 group-hover:text-gold transition-colors line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-gray-500 text-xs mt-2">
                    {formatRelativeDate(video.createdAt)}
                  </p>
                </div>
              </motion.a>
            )
          })}
        </motion.div>

        {showNav && (
          <>
            <button
              type="button"
              aria-label="Previous stream"
              onClick={goPrev}
              className="absolute left-1 md:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-gold text-black flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next stream"
              onClick={goNext}
              className="absolute right-1 md:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-gold text-black flex items-center justify-center shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {showNav && (
        <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Stream slides">
          {videos.map((video, i) => (
            <button
              key={video.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Show stream ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? 'w-6 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
