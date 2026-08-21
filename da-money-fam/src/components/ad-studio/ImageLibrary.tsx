'use client'

import type { AdStudioImageRow } from '@/hooks/useImageStudio'

export default function ImageLibrary({
  items,
  onSelect,
  onEdit,
  onUseForVideo,
}: {
  items: AdStudioImageRow[]
  onSelect: (url: string) => void
  onEdit: (url: string) => void
  onUseForVideo: (url: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-[11px] text-white/35 px-3 py-4">No images yet — generate one above.</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3 max-h-64 overflow-y-auto">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative group rounded-lg overflow-hidden border border-white/10 bg-black"
        >
          <button type="button" onClick={() => onSelect(item.output_url)} className="block w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.output_url} alt="" className="w-full aspect-square object-cover" />
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item.output_url)}
              className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onUseForVideo(item.output_url)}
              className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold text-black"
            >
              Video
            </button>
            <a
              href={item.output_url}
              download
              target="_blank"
              rel="noreferrer"
              className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white"
            >
              DL
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
