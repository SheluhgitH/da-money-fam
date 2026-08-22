'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GTA_IMAGE_STYLES } from '@/lib/gta-image-styles'
import { GTA_MARKETING_SAMPLES } from '@/lib/gta-marketing-samples'
import { IMAGE_MODELS } from '@/lib/image-models'
import type { ImageStudioController } from '@/hooks/useImageStudio'

export default function GtaStylePanel({
  images,
  onUseForVideo,
}: {
  images: ImageStudioController
  onUseForVideo?: (url: string) => void
}) {
  const [shakeUpload, setShakeUpload] = useState(false)

  useEffect(() => {
    images.fetchGtaQuotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fastPrice = images.gtaQuotes.fast?.priceCoins ?? IMAGE_MODELS.fast.baseCoins
  const smartPrice = images.gtaQuotes.smart?.priceCoins ?? IMAGE_MODELS.smart.baseCoins
  const activeStyle = GTA_IMAGE_STYLES.find((s) => s.id === images.activeGtaStyleId)

  const onStyleTap = (styleId: string) => {
    if (!images.gtaPhotoUrl && !images.references[0]) {
      setShakeUpload(true)
      images.setError('Add a photo first')
      window.setTimeout(() => setShakeUpload(false), 500)
      return
    }
    void images.generateGtaStyle(styleId)
  }

  const photo = images.gtaPhotoUrl || images.references[0] || null
  const resultUrl = images.previewUrl

  return (
    <motion.div
      className="flex flex-col h-full min-h-0"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <div className="shrink-0 px-4 pt-3 pb-2 space-y-3 border-b border-gold/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-gold text-lg leading-none">GTA Styles</p>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] mt-1">
              Upload · tap an era · generate
            </p>
          </div>
          <div className="relative flex rounded-full border border-gold/25 bg-black/60 p-0.5">
            <motion.div
              className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-gold"
              animate={{ left: images.gtaQuality === 'fast' ? 2 : '50%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => images.setGtaQuality('fast')}
              className={`relative z-10 px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full min-w-[4.5rem] ${
                images.gtaQuality === 'fast' ? 'text-black font-bold' : 'text-gold/70'
              }`}
            >
              Fast · {fastPrice}
            </button>
            <button
              type="button"
              onClick={() => images.setGtaQuality('smart')}
              className={`relative z-10 px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-full min-w-[5.5rem] ${
                images.gtaQuality === 'smart' ? 'text-black font-bold' : 'text-gold/70'
              }`}
            >
              Smart HD · {smartPrice}
            </button>
          </div>
        </div>
        {images.gtaQuality === 'smart' && (
          <p className="text-[9px] text-gold/50 uppercase tracking-widest">Best quality · no discount</p>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="p-4">
          <input
            ref={images.gtaFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              images.setGtaPhotoFromFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <motion.button
            type="button"
            onClick={() => images.gtaFileRef.current?.click()}
            animate={shakeUpload ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="relative w-full aspect-[16/10] max-h-[220px] rounded-2xl border border-dashed border-gold/35 bg-white/[0.02] overflow-hidden group"
          >
            {photo ? (
              <motion.img
                key={photo}
                src={photo}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ scale: 1.08, opacity: 0.6 }}
                animate={{ scale: 1.02, opacity: 1 }}
                transition={{ duration: 6, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="text-gold/80 text-xs uppercase tracking-[0.25em]">Drop a photo</span>
                <span className="text-white/30 text-[10px]">iPhone photos OK · auto-optimized</span>
              </div>
            )}
            {photo && (
              <span className="absolute bottom-2 right-2 text-[9px] uppercase tracking-wider bg-black/70 text-gold px-2 py-1 rounded-full border border-gold/30">
                Change photo
              </span>
            )}
            <AnimatePresence>
              {(images.generating || images.optimizing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/55 flex items-center justify-center"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gold animate-pulse">
                    {images.optimizing
                      ? 'Optimizing photo…'
                      : activeStyle
                        ? `Creating ${activeStyle.label}…`
                        : 'Creating…'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {photo && (
            <button
              type="button"
              onClick={() => images.clearGtaPhoto()}
              className="mt-2 text-[9px] uppercase tracking-widest text-white/35 hover:text-gold"
            >
              Clear photo
            </button>
          )}

          {!photo && (
            <div className="mt-5">
              <p className="text-[10px] uppercase tracking-widest text-gold/45 mb-3">
                See what&apos;s possible
              </p>
              <div className="grid grid-cols-3 gap-2">
                {GTA_MARKETING_SAMPLES.map((sample, i) => (
                  <motion.button
                    key={sample.id}
                    type="button"
                    onClick={() => images.setPreviewUrl(sample.url)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + i * 0.06 }}
                    whileHover={{ y: -2 }}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gold/20 bg-black group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sample.url}
                      alt={sample.label}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pb-1.5 pt-6">
                      <span className="block text-[8px] uppercase tracking-wider text-gold truncate">
                        {sample.label}
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-gold/45 mb-3">Choose an era</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {GTA_IMAGE_STYLES.map((style, i) => {
              const active = images.activeGtaStyleId === style.id
              return (
                <motion.button
                  key={style.id}
                  type="button"
                  disabled={images.generating || images.optimizing}
                  onClick={() => onStyleTap(style.id)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.35), type: 'spring', stiffness: 320, damping: 24 }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative text-left rounded-xl border p-3 overflow-hidden disabled:opacity-60 ${
                    active ? 'border-gold shadow-[0_0_24px_rgba(255,215,0,0.25)]' : 'border-white/10'
                  }`}
                  style={{
                    background: `linear-gradient(145deg, ${style.accent}33 0%, #0a0a0a 55%)`,
                  }}
                >
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 opacity-80"
                    style={{ background: style.accent }}
                  />
                  {active && (
                    <motion.span
                      className="absolute inset-0 bg-gold/10"
                      animate={{ opacity: [0.15, 0.35, 0.15] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                  <span className="relative block font-serif text-sm text-white">{style.label}</span>
                  <span className="relative block text-[9px] text-white/45 mt-1 uppercase tracking-wider">
                    {style.era}
                  </span>
                  <span className="relative block text-[9px] text-gold/70 mt-2 font-mono">
                    {images.gtaPriceCoins} Coinz
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {resultUrl && resultUrl !== photo && (
            <motion.div
              key={resultUrl}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="px-4 pb-4"
            >
              <p className="text-[10px] uppercase tracking-widest text-gold/45 mb-2">Result</p>
              <div className="relative rounded-2xl overflow-hidden border border-gold/25 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="" className="w-full max-h-[360px] object-contain mx-auto" />
              </div>
              {onUseForVideo && (
                <button
                  type="button"
                  onClick={() => onUseForVideo(resultUrl)}
                  className="mt-3 text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/30 text-gold hover:bg-gold hover:text-black transition-colors"
                >
                  Use for video ad
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-gold/15 bg-black/85 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {images.error ? (
            <p className="text-xs text-red-300 truncate">{images.error}</p>
          ) : images.optimizing ? (
            <p className="text-[10px] uppercase tracking-widest text-gold/70 truncate animate-pulse">
              Optimizing photo…
            </p>
          ) : images.generating ? (
            <p className="text-[10px] uppercase tracking-widest text-gold/70 truncate animate-pulse">
              {activeStyle ? `Creating ${activeStyle.label}…` : 'Creating…'}
            </p>
          ) : (
            <p className="text-[10px] uppercase tracking-widest text-white/40 truncate">
              {images.gtaQuality === 'smart' ? 'Smart HD' : 'Fast'} · {images.gtaPriceCoins} Coinz per style
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono text-gold/80 shrink-0">
          {images.gtaQuotes[images.gtaQuality]?.balance ?? images.quote?.balance ?? '—'} Coinz
        </span>
      </div>
    </motion.div>
  )
}
