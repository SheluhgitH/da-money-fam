'use client'

import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react'

type BackgroundVideoProps = {
  src: string
  className?: string
  poster?: string
}

/** Muted background video that plays when in viewport (required for iOS/mobile). */
const BackgroundVideo = forwardRef<HTMLVideoElement, BackgroundVideoProps>(
  function BackgroundVideo({ src, className = '', poster }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement)

  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!container || !video) return

    video.muted = true
    video.defaultMuted = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', 'true')

    const tryPlay = () => {
      video.load() // Ensure video is loaded
      const playPromise = video.play()
      if (playPromise) {
        playPromise.catch((error) => {
          console.warn("Background video autoplay failed:", error)
        })
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryPlay()
        } else {
          video.pause()
        }
      },
      { threshold: 0.2, rootMargin: '0px' }
    )

    observer.observe(container)

    const unlockOnGesture = () => {
      // Attempt to play on any user gesture, which often unblocks autoplay
      tryPlay()
    }
    document.addEventListener('touchstart', unlockOnGesture, { once: true, passive: true })
    document.addEventListener('click', unlockOnGesture, { once: true })

    return () => {
      observer.disconnect()
      document.removeEventListener('touchstart', unlockOnGesture)
      document.removeEventListener('click', unlockOnGesture)
      video.pause()
    }
  }, [src])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        poster={poster}
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  )
})

export default BackgroundVideo
