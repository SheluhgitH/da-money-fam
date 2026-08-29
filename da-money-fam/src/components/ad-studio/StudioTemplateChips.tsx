'use client'

import { useState } from 'react'
import {
  PROMPT_TEMPLATE_GROUPS,
  STUDIO_TEMPLATES,
  STORYBOARD_TEMPLATES,
  type PromptTemplateGroup,
  type StudioTemplate,
  type StoryboardTemplate,
} from '@/lib/studio-templates'

export default function StudioTemplateChips({
  onPick,
  onPickStoryboard,
  storyboardMode = false,
}: {
  onPick: (t: StudioTemplate) => void
  onPickStoryboard?: (t: StoryboardTemplate) => void
  storyboardMode?: boolean
}) {
  const [group, setGroup] = useState<PromptTemplateGroup | 'all' | 'story'>('all')
  const templates =
    group === 'all' || group === 'story'
      ? STUDIO_TEMPLATES
      : STUDIO_TEMPLATES.filter((t) => t.group === group)

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 studio-scroll">
        <button
          type="button"
          onClick={() => setGroup('all')}
          className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
            group === 'all' ? 'border-gold text-gold' : 'border-white/10 text-white/40'
          }`}
        >
          Shots
        </button>
        {storyboardMode && (
          <button
            type="button"
            onClick={() => setGroup('story')}
            className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
              group === 'story' ? 'border-gold text-gold' : 'border-white/10 text-white/40'
            }`}
          >
            Story packs
          </button>
        )}
        {PROMPT_TEMPLATE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGroup(g.id)}
            className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-1 rounded-full border ${
              group === g.id ? 'border-gold text-gold' : 'border-white/10 text-white/40'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {group === 'story' && storyboardMode ? (
        <div className="flex gap-2 overflow-x-auto pb-1 studio-scroll">
          {STORYBOARD_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPickStoryboard?.(t)}
              className="shrink-0 text-left px-3 py-2 rounded-xl border border-gold/25 bg-gold/5 hover:border-gold hover:bg-gold/15 transition-colors min-w-[9.5rem] max-w-[11rem]"
            >
              <span className="block text-[10px] uppercase tracking-wider text-gold">{t.label}</span>
              <span className="block text-[10px] text-white/45 mt-0.5 leading-snug">{t.tagline}</span>
              <span className="block text-[9px] text-white/30 mt-1">{t.scenes.length} scenes</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 studio-scroll">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className="shrink-0 text-left px-3 py-2 rounded-xl border border-gold/25 bg-gold/5 hover:border-gold hover:bg-gold/15 transition-colors min-w-[9.5rem] max-w-[11rem]"
            >
              <span className="block text-[10px] uppercase tracking-wider text-gold">{t.label}</span>
              <span className="block text-[10px] text-white/45 mt-0.5 leading-snug">{t.tagline}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
