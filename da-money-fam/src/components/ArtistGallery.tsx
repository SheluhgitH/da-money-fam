'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

interface ArtistGalleryProps {
  isOpen: boolean
  onClose: () => void
  images: { id: string; src: string; alt: string }[]
  artistName: string
}

export default function ArtistGallery({ isOpen, onClose, images, artistName }: ArtistGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, nextImage, prevImage])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    setCurrentIndex(0)
  }, [artistName])

  if (images.length === 0) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          <div className="absolute inset-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Back / close — above nav (z-100) */}
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              onClick={onClose}
              className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-4 py-2.5 text-white shadow-lg backdrop-blur-md transition-colors hover:border-gold/50 hover:bg-black/80"
              aria-label="Close gallery"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest">Back</span>
            </motion.button>

            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              onClick={onClose}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition-colors hover:border-gold/50 hover:bg-black/80"
              aria-label="Close gallery"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {images.length > 1 && (
              <>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={prevImage}
                  className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-300 hover:bg-white/20 md:left-8"
                  aria-label="Previous image"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </motion.button>

                <motion.button
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={nextImage}
                  className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-300 hover:bg-white/20 md:right-8"
                  aria-label="Next image"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </motion.button>
              </>
            )}

            <div className="relative mx-4 w-full max-w-4xl md:mx-16">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-gold/30 shadow-2xl shadow-gold/10 md:aspect-video"
                >
                  <img
                    src={images[currentIndex].src}
                    alt={images[currentIndex].alt}
                    className="h-full w-full bg-black/50 object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-sm font-medium tracking-wider text-white/70">
                {artistName} · {currentIndex + 1} / {images.length}
              </div>
            </div>

            {images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pointer-events-none absolute bottom-6 inset-x-0 z-10 flex justify-center px-4"
              >
                <div className="gallery-thumb-strip pointer-events-auto flex max-w-[min(90vw,56rem)] overflow-x-auto overscroll-x-contain rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="mx-auto flex w-max gap-3">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all duration-300 md:h-20 md:w-20 ${
                          index === currentIndex
                            ? 'scale-110 shadow-[0_0_16px_rgba(212,175,55,0.35)] ring-2 ring-gold'
                            : 'opacity-50 hover:opacity-100'
                        }`}
                        aria-label={`View ${image.alt}`}
                      >
                        <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
