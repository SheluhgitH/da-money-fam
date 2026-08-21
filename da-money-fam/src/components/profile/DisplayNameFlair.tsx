'use client'

type DisplayNameFlairProps = {
  name: string
  cosmetics?: string[] | null
  className?: string
  nameClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

function CrownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M3.5 17.5 2 8l5.5 4L12 4l4.5 8L22 8l-1.5 9.5H3.5Zm1.2 1.5h14.6v1.5H4.7V19Z" />
    </svg>
  )
}

function VerifiedIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

const sizeMap = {
  sm: {
    crown: 'w-3.5 h-3.5 -top-2 -right-1',
    check: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    crown: 'w-4.5 h-4.5 -top-2.5 -right-1.5',
    check: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    crown: 'w-6 h-6 -top-3.5 -right-2',
    check: 'w-5 h-5',
    gap: 'gap-2',
  },
}

export default function DisplayNameFlair({
  name,
  cosmetics,
  className = '',
  nameClassName = '',
  size = 'md',
}: DisplayNameFlairProps) {
  const active = cosmetics || []
  const hasCrown = active.includes('crown_gold')
  const hasGlow = active.includes('name_gold_glow')
  const hasVerified = active.includes('verified_check')
  const s = sizeMap[size]

  return (
    <span className={`relative inline-flex items-center ${s.gap} max-w-full ${className}`}>
      <span className="relative inline-block max-w-full">
        {hasCrown && (
          <span
            className={`absolute ${s.crown} text-gold drop-shadow-[0_0_6px_rgba(212,175,55,0.7)] pointer-events-none`}
            style={{ transform: 'rotate(-18deg)' }}
          >
            <CrownIcon className="w-full h-full" />
          </span>
        )}
        <span
          className={`truncate inline-block max-w-full ${
            hasGlow
              ? 'gold-gradient font-semibold animate-pulse [text-shadow:0_0_12px_rgba(212,175,55,0.45)]'
              : ''
          } ${nameClassName}`}
        >
          {name}
        </span>
      </span>
      {hasVerified && (
        <VerifiedIcon className={`${s.check} text-gold shrink-0 drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]`} />
      )}
    </span>
  )
}
