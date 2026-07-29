'use client'

import { ASPECT_CLASS } from '@/lib/ad-studio-types'
import type { AdStudioController } from '@/hooks/useAdStudio'

export default function PreviewCanvas({ studio }: { studio: AdStudioController }) {
  const aspectClass = ASPECT_CLASS[studio.aspectRatio] || ASPECT_CLASS['9:16']
  const url = studio.previewUrls[studio.activePreviewIndex] || null

  const onEnded = () => {
    if (studio.previewUrls.length > 1) {
      const next = (studio.activePreviewIndex + 1) % studio.previewUrls.length
      studio.setActivePreviewIndex(next)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 min-h-0">
      <div
        className={`relative w-full max-w-md ${aspectClass} max-h-full rounded-2xl overflow-hidden border border-gold/20 bg-black shadow-[0_0_60px_rgba(255,215,0,0.08)]`}
      >
        {url ? (
          <video
            key={url}
            src={url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
            onEnded={onEnded}
          />
        ) : studio.generating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="h-10 w-10 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 px-4 text-center">
              {studio.statusText || 'Rendering…'}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-900 via-black to-black">
            <p className="font-serif text-gold text-lg">Ad Studio</p>
            <p className="text-[11px] text-white/35 uppercase tracking-[0.2em] text-center px-6">
              Describe your ad below
            </p>
          </div>
        )}
      </div>

      {studio.previewUrls.length > 1 && (
        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          {studio.previewUrls.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => studio.setActivePreviewIndex(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden border ${
                i === studio.activePreviewIndex ? 'border-gold' : 'border-white/15'
              }`}
            >
              <video src={src} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {url && (
        <div className="flex gap-2 mt-4 flex-wrap justify-center">
          {studio.previewUrls.map((src, i) => (
            <a
              key={`dl-${src}-${i}`}
              href={src}
              download={`dmf-ad-${i + 1}.mp4`}
              className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full bg-gold text-black font-bold hover:bg-white transition-colors"
            >
              Download {studio.previewUrls.length > 1 ? i + 1 : ''}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
