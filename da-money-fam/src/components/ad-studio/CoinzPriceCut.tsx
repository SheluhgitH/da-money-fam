'use client'

/**
 * Shows red strikethrough legacy "was" price next to current Coinz.
 * Independent of Fan Club gray strikethrough.
 */
export default function CoinzPriceCut({
  current,
  legacy,
  suffix = '',
  className = '',
}: {
  current: number
  legacy?: number | null
  suffix?: string
  className?: string
}) {
  const showCut = legacy != null && legacy > current
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showCut && (
        <span className="text-red-400 line-through decoration-red-500 decoration-2">
          {legacy}
          {suffix}
        </span>
      )}
      <span>
        {current}
        {suffix}
      </span>
    </span>
  )
}
