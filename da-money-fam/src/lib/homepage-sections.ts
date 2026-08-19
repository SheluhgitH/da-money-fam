export type HomepageSectionId =
  | 'songs'
  | 'music'
  | 'about'
  | 'streams'
  | 'ad-studio'
  | 'collage'
  | 'roster'
  | 'social'
  | 'merch'
  | 'membership'
  | 'testimonials'
  | 'perks'
  | 'events'
  | 'blog'
  | 'pricing-video'
  | 'video-editing'
  | 'hero-video'

export interface HomepageSectionConfig {
  id: HomepageSectionId
  hidden?: boolean
}

export const HOMEPAGE_SECTION_META: Record<HomepageSectionId, { label: string; eager: boolean }> = {
  songs: { label: 'Song store', eager: true },
  music: { label: 'Music player', eager: true },
  about: { label: 'Who we are', eager: true },
  streams: { label: 'Streams', eager: false },
  'ad-studio': { label: 'Ad Studio promo', eager: false },
  collage: { label: 'Collective collage', eager: false },
  roster: { label: 'Artist roster', eager: false },
  social: { label: 'Social wall', eager: false },
  merch: { label: 'Merch', eager: false },
  membership: { label: 'Membership CTA', eager: false },
  testimonials: { label: 'Testimonials', eager: false },
  perks: { label: 'Fan perks', eager: false },
  events: { label: 'Events', eager: false },
  blog: { label: 'Blog', eager: false },
  'pricing-video': { label: 'Video pricing', eager: false },
  'video-editing': { label: 'Video editing', eager: false },
  'hero-video': { label: 'Hero video', eager: false },
}

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = (
  Object.keys(HOMEPAGE_SECTION_META) as HomepageSectionId[]
).map((id) => ({ id, hidden: false }))

export function asHomepageSections(value: unknown): HomepageSectionConfig[] {
  const seen = new Set<string>()
  const fromSettings: HomepageSectionConfig[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      const id =
        typeof item === 'string'
          ? item
          : item && typeof item === 'object'
            ? String((item as { id?: string }).id || '')
            : ''
      if (!(id in HOMEPAGE_SECTION_META) || seen.has(id)) continue
      seen.add(id)
      const hidden =
        typeof item === 'object' && item
          ? Boolean((item as { hidden?: boolean }).hidden)
          : false
      fromSettings.push({ id: id as HomepageSectionId, hidden })
    }
  }
  for (const row of DEFAULT_HOMEPAGE_SECTIONS) {
    if (!seen.has(row.id)) fromSettings.push({ ...row })
  }
  return fromSettings
}
