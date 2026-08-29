'use client'

import { useEffect, useId, useRef, useState } from 'react'

export default function StudioInfoTip({
  label,
  children,
}: {
  label: string
  children: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <span ref={rootRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="w-4 h-4 rounded-full border border-gold/40 text-[9px] font-bold text-gold/80 leading-none flex items-center justify-center hover:bg-gold/10"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-[40] bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg border border-gold/25 bg-black/95 px-2.5 py-2 text-[10px] leading-snug text-white/70 shadow-lg"
        >
          <span className="block text-gold/80 uppercase tracking-wider text-[9px] mb-1">{label}</span>
          {children}
        </span>
      )}
    </span>
  )
}
