'use client'

import type { AdStudioImageRow } from '@/hooks/useImageStudio'

export default function ImageLibrary({
  items,
  selectedUrl,
  onSelect,
  onEdit,
  onUseForVideo,
  onUseAsFirst,
}: {
  items: AdStudioImageRow[]
  selectedUrl?: string | null
  onSelect: (url: string) => void
  onEdit: (url: string) => void
  onUseForVideo: (url: string) => void
  onUseAsFirst?: (url: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-[11px] text-white/35 px-3 py-4">No images yet — generate one above.</p>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain studio-scroll">
      <div className="grid grid-cols-2 gap-2 p-3">
        {items.map((item) => {
          const active = selectedUrl === item.output_url
          return (
            <div
              key={item.id}
              className={`rounded-lg overflow-hidden border bg-black ${
                active ? 'border-gold' : 'border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(item.output_url)}
                className="relative block w-full aspect-square overflow-hidden bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.output_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
              <div className="bg-black/90 p-1.5 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(item.output_url)}
                  className="text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onUseForVideo(item.output_url)}
                  className="text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-gold text-black"
                >
                  Video
                </button>
                {onUseAsFirst && (
                  <button
                    type="button"
                    onClick={() => onUseAsFirst(item.output_url)}
                    className="text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-white"
                  >
                    First
                  </button>
                )}
                <a
                  href={item.output_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="text-[9px] uppercase tracking-wider px-2 py-1 rounded bg-white/10 text-white"
                >
                  DL
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
