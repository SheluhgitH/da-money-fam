'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdStudioController } from '@/hooks/useAdStudio'
import StudioInlinePicker, { type StudioOptionCategory } from './StudioInlinePicker'
import { SEEDANCE_MODELS, audioAddonCoins } from '@/lib/seedance-models'
import { MOTION_MODES, IDENTITY_STRENGTHS } from '@/lib/ad-studio-motion'
import { CREATIVE_ROWS } from '@/lib/ad-creative-presets'
import { ASSISTANT_OPEN_EVENT } from '@/lib/assistant-visibility'

function optionLabel(cat: StudioOptionCategory) {
  return cat.options.find((o) => o.id === cat.value)?.label || cat.value
}

export default function StudioSetupStrip({ studio }: { studio: AdStudioController }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [lookOpen, setLookOpen] = useState(false)

  const modelCfg = SEEDANCE_MODELS[studio.modelKey]
  const audioAddon =
    studio.pricing?.audioAddonCoins ??
    (modelCfg.supportsAudio ? audioAddonCoins(modelCfg.baseCoins) : 0)

  const categories: StudioOptionCategory[] = useMemo(() => {
    const cats: StudioOptionCategory[] = [
      {
        id: 'motion',
        label: 'Motion',
        tip: 'Guide = likeness only. Lock start freezes the open. Animate A→B morphs Start into End.',
        value: studio.motionMode,
        options: MOTION_MODES.map((m) => ({ id: m.id, label: m.label, hint: m.hint })),
      },
      {
        id: 'model',
        label: 'Model',
        tip: 'Lite is fastest / cheapest. Mini balances quality. Fast is highest fidelity.',
        value: studio.modelKey,
        options: (['lite', 'mini', 'fast'] as const).map((k) => ({
          id: k,
          label: SEEDANCE_MODELS[k].label,
        })),
      },
      {
        id: 'duration',
        label: 'Time',
        value: String(studio.duration),
        options: modelCfg.durations.map((d) => ({ id: String(d), label: `${d}s` })),
      },
      {
        id: 'aspect',
        label: 'Aspect',
        value: studio.aspectRatio,
        options: [
          { id: '9:16', label: '9:16' },
          { id: '1:1', label: '1:1' },
          { id: '16:9', label: '16:9' },
        ],
      },
      {
        id: 'identity',
        label: 'Identity',
        tip: 'How tightly Seedance holds face and wardrobe from your stills.',
        value: studio.identityStrength,
        options: IDENTITY_STRENGTHS.map((s) => ({
          id: s.id,
          label: s.label,
          hint: s.hint,
        })),
      },
    ]

    if (modelCfg.resolutions.length > 1) {
      cats.push({
        id: 'resolution',
        label: 'Res',
        value: studio.resolution,
        options: modelCfg.resolutions.map((r) => ({ id: r, label: r })),
      })
    }

    if (studio.mode === 'single') {
      cats.push({
        id: 'variations',
        label: 'Vars',
        tip: 'Generate 1 or 2 takes of the same brief.',
        value: String(studio.variations),
        options: [
          { id: '1', label: '1x' },
          { id: '2', label: '2x' },
        ],
      })
    } else {
      cats.push({
        id: 'physics',
        label: 'Physics',
        tip: 'Hint for body / product motion across storyboard scenes.',
        value: studio.physicsPreset,
        options: [
          { id: 'default', label: 'Default' },
          { id: 'walking', label: 'Walk' },
          { id: 'product', label: 'Product' },
        ],
      })
    }

    if (modelCfg.supportsAudio) {
      cats.push({
        id: 'sound',
        label: 'Sound',
        tip: audioAddon > 0 ? `Native audio costs +${audioAddon}c when On.` : 'Native audio for this model.',
        value: studio.generateAudio ? 'on' : 'off',
        options: [
          { id: 'off', label: 'Off' },
          { id: 'on', label: 'On' },
        ],
      })
    }

    return cats
  }, [
    studio.motionMode,
    studio.modelKey,
    studio.duration,
    studio.aspectRatio,
    studio.identityStrength,
    studio.resolution,
    studio.variations,
    studio.physicsPreset,
    studio.generateAudio,
    studio.mode,
    modelCfg,
    audioAddon,
  ])

  const active = categories.find((c) => c.id === activeId) ?? null

  // Outside tap closes tools / inline picker (not Look — has its own Close)
  useEffect(() => {
    if (!activeId && !toolsOpen) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (!rootRef.current?.contains(t)) {
        setActiveId(null)
        setToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [activeId, toolsOpen])

  const onPick = useCallback(
    (categoryId: string, optionId: string) => {
      if (categoryId === 'motion') studio.setMotionMode(optionId as typeof studio.motionMode)
      else if (categoryId === 'model') studio.setModelKey(optionId as typeof studio.modelKey)
      else if (categoryId === 'duration') studio.setDuration(Number(optionId))
      else if (categoryId === 'aspect') studio.setAspectRatio(optionId)
      else if (categoryId === 'resolution') studio.setResolution(optionId as '480p' | '720p')
      else if (categoryId === 'variations') studio.setVariations(Number(optionId) as 1 | 2)
      else if (categoryId === 'physics')
        studio.setPhysicsPreset(optionId as typeof studio.physicsPreset)
      else if (categoryId === 'identity')
        studio.setIdentityStrength(optionId as typeof studio.identityStrength)
      else if (categoryId === 'sound') studio.setGenerateAudio(optionId === 'on')
    },
    [studio]
  )

  return (
    <div ref={rootRef} className="relative space-y-2 min-w-0">
      <div className="flex items-start gap-2 min-w-0">
        <div className="min-w-0 flex-1 flex gap-1.5 overflow-x-auto studio-scroll flex-nowrap pb-0.5">
          {categories.map((cat) => {
            const isActive = activeId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setToolsOpen(false)
                  setLookOpen(false)
                  setActiveId((cur) => (cur === cat.id ? null : cat.id))
                }}
                className={`shrink-0 min-w-[3.75rem] rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                  isActive
                    ? 'border-gold bg-gold/15'
                    : 'border-gold/25 bg-black/30 hover:border-gold/50'
                }`}
              >
                <span className="block text-[9px] uppercase tracking-[0.14em] text-white/40 leading-none">
                  {cat.label}
                </span>
                <span className="block text-[11px] font-semibold text-gold mt-1 leading-tight truncate max-w-[5.5rem]">
                  {optionLabel(cat)}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Tools"
          onClick={() => {
            setActiveId(null)
            setLookOpen(false)
            setToolsOpen((o) => !o)
          }}
          className={`shrink-0 w-9 h-9 mt-0.5 rounded-full border text-sm ${
            toolsOpen
              ? 'border-gold bg-gold/15 text-gold'
              : 'border-gold/30 text-gold/70'
          }`}
        >
          ···
        </button>
      </div>

      {active && (
        <StudioInlinePicker
          label={active.label}
          tip={active.tip}
          value={active.value}
          options={active.options}
          onChange={(id) => onPick(active.id, id)}
        />
      )}

      {toolsOpen && (
        <div className="absolute right-0 top-full z-[96] mt-1 w-56 rounded-xl border border-gold/30 bg-black/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden">
          <p className="px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-gold/60 border-b border-gold/15">
            Tools
          </p>
          {(
            [
              ['Same look', () => studio.applyContinuityChip('same_look')],
              ['Animate still→still', () => studio.applyContinuityChip('animate_still')],
              [
                studio.extractingLastFrame ? 'Extracting…' : 'Use last frame',
                () => void studio.useLastFrameAsStart(),
              ],
              [
                'Save look',
                async () => {
                  try {
                    await studio.savePreset()
                  } catch (err) {
                    studio.setError(err instanceof Error ? err.message : 'Failed to save look')
                  }
                },
              ],
            ] as const
          ).map(([label, fn]) => (
            <button
              key={label}
              type="button"
              disabled={
                label.startsWith('Extract') ||
                (label === 'Use last frame' && !studio.previewUrls.length)
              }
              onClick={() => {
                void fn()
                setToolsOpen(false)
              }}
              className="w-full text-left px-3 py-2.5 text-[11px] text-white/75 hover:bg-gold/10 hover:text-gold border-b border-white/5 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
          {studio.presets.length > 0 && (
            <div className="border-b border-white/5 py-1 max-h-28 overflow-y-auto studio-scroll">
              <p className="px-3 py-1 text-[9px] uppercase tracking-wider text-white/35">Presets</p>
              {studio.presets.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    studio.applyPreset(p)
                    setToolsOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-gold/70 hover:bg-gold/10"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setToolsOpen(false)
              setActiveId(null)
              setLookOpen(true)
            }}
            className="w-full text-left px-3 py-2.5 text-[11px] text-white/75 hover:bg-gold/10 hover:text-gold border-b border-white/5"
          >
            Look
          </button>
          <button
            type="button"
            onClick={() => {
              setToolsOpen(false)
              window.dispatchEvent(
                new CustomEvent(ASSISTANT_OPEN_EVENT, {
                  detail: {
                    askBar: true,
                    seed: 'Help write this video prompt and keep character consistency.',
                  },
                })
              )
            }}
            className="w-full text-left px-3 py-2.5 text-[11px] text-white/75 hover:bg-gold/10 hover:text-gold border-b border-white/5"
          >
            Help
          </button>
          <button
            type="button"
            onClick={() => {
              setToolsOpen(false)
              window.dispatchEvent(
                new CustomEvent(ASSISTANT_OPEN_EVENT, {
                  detail: {
                    askBar: true,
                    seed: 'Help me lock a character for consistent identity across clips.',
                  },
                })
              )
            }}
            className="w-full text-left px-3 py-2.5 text-[11px] text-white/75 hover:bg-gold/10 hover:text-gold"
          >
            Character · {studio.lookCharacterName || (studio.lookCharacterId ? 'Locked' : 'None')}
          </button>
        </div>
      )}

      {lookOpen && (
        <div className="rounded-xl border border-gold/30 bg-black/95 backdrop-blur-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-bold">Look</p>
            <button
              type="button"
              onClick={() => setLookOpen(false)}
              className="text-[10px] text-white/40"
            >
              Close
            </button>
          </div>

          {CREATIVE_ROWS.map((row) => (
            <StudioInlinePicker
              key={row.id}
              label={row.label}
              value={studio.creative[row.id]}
              options={row.options.map((o) => ({ id: o.id, label: o.label }))}
              onChange={(id) => studio.setCreativeOption(row.id, id)}
            />
          ))}

          <div className="rounded-xl border border-gold/20 bg-black/40 px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] text-white/60">Enhance prompt</span>
              {studio.pricing?.canEnhance ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={studio.enhance}
                  onClick={() => studio.setEnhance(!studio.enhance)}
                  className={`relative w-11 h-6 rounded-full ${studio.enhance ? 'bg-gold' : 'bg-white/15'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      studio.enhance ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              ) : (
                <a href="/account" className="text-[10px] text-gold underline">
                  Join
                </a>
              )}
            </div>
            {studio.pricing?.canEnhance && (
              <button
                type="button"
                disabled={studio.enhancePreviewLoading}
                onClick={() => studio.previewEnhance()}
                className="w-full text-[10px] uppercase tracking-wider py-2 rounded-full border border-gold/40 text-gold disabled:opacity-40"
              >
                {studio.enhancePreviewLoading ? 'Enhancing…' : 'Preview enhance'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
