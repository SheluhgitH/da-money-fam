'use client'

import Image from 'next/image'
import { useState } from 'react'

type UserAvatarProps = {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-20 h-20 text-2xl',
}

export default function UserAvatar({
  avatarUrl,
  displayName,
  email,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)

  const fallback =
    displayName?.[0]?.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    'U'

  if (avatarUrl && !imgError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden border border-gold/40 bg-gold/10 shrink-0 ${sizeClasses[size]} ${className}`}
      >
        <Image
          src={avatarUrl}
          alt={displayName || 'User avatar'}
          fill
          className="object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold font-bold shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {fallback}
    </div>
  )
}
