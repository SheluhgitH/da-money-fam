'use client'

import Image from 'next/image'
import Modal from '@/components/Modal'
import { usePreviewPlayer } from '@/contexts/PreviewPlayerContext'

export default function PreviewUpsellModal() {
  const {
    activePreview,
    upsellOpen,
    purchasing,
    purchaseError,
    closeUpsell,
    replayPreview,
    purchasePreviewSong,
  } = usePreviewPlayer()

  const show =
    upsellOpen &&
    Boolean(activePreview) &&
    !activePreview?.owned &&
    Boolean(activePreview?.for_sale)

  if (!activePreview) return null

  const priceLabel =
    typeof activePreview.price === 'number'
      ? `$${activePreview.price.toFixed(2)}`
      : null

  return (
    <Modal isOpen={show} onClose={closeUpsell} title="Keep listening">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {activePreview.cover ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gold/30">
              <Image
                src={activePreview.cover}
                alt={activePreview.title}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-black/50 shrink-0 border border-white/10" />
          )}
          <div className="min-w-0">
            <p className="text-[10px] text-gold uppercase tracking-wider truncate">
              {activePreview.artist}
            </p>
            <p className="text-white text-lg font-semibold truncate">{activePreview.title}</p>
            {priceLabel && (
              <p className="text-gold font-mono text-sm mt-1">{priceLabel}</p>
            )}
          </div>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed">
          Unlock the full track in your library and keep listening anytime.
        </p>

        {purchaseError && (
          <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {purchaseError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void purchasePreviewSong()}
            disabled={purchasing}
            className="w-full bg-gold text-black text-sm font-bold px-6 py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
          >
            {purchasing
              ? 'Redirecting...'
              : priceLabel
                ? `Buy for ${priceLabel}`
                : 'Buy now'}
          </button>
          <button
            type="button"
            onClick={() => void replayPreview()}
            disabled={purchasing}
            className="w-full border border-gold/40 text-gold text-sm font-bold px-6 py-3 rounded-full uppercase tracking-wider hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            Listen again
          </button>
        </div>
      </div>
    </Modal>
  )
}
