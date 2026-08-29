'use client'

import StudioInfoTip from './StudioInfoTip'

export type StudioOption = {
  id: string
  label: string
  hint?: string
  disabled?: boolean
}

export type StudioOptionCategory = {
  id: string
  label: string
  options: StudioOption[]
  value: string
  /** Shown next to the category label via info tip */
  tip?: string
}

export default function StudioInlinePicker({
  label,
  tip,
  value,
  options,
  onChange,
}: {
  label: string
  tip?: string
  value: string
  options: StudioOption[]
  onChange: (id: string) => void
}) {
  const selected = options.find((o) => o.id === value)
  const hint = selected?.hint

  return (
    <div className="rounded-xl border border-gold/25 bg-black/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gold/70 font-semibold">
          {label}
        </p>
        {tip ? <StudioInfoTip label={label}>{tip}</StudioInfoTip> : null}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => {
          const active = opt.id === value
          return (
            <button
              key={opt.id}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                if (opt.disabled) return
                onChange(opt.id)
              }}
              className={`shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-30 ${
                active
                  ? 'bg-gold text-black border-gold'
                  : 'border-gold/30 text-gold/80 hover:border-gold/60 hover:bg-gold/10'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {hint ? (
        <p className="text-[10px] text-white/45 leading-snug">{hint}</p>
      ) : null}
    </div>
  )
}
