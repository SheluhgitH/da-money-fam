import type { CreativeSelections } from '@/lib/ad-creative-presets'

export type PromptTemplateGroup = 'product' | 'artist' | 'brand' | 'hype'

export interface AdPromptTemplate {
  id: string
  group: PromptTemplateGroup
  label: string
  brief: string
  /** Optional Look drawer presets applied when template is selected */
  creative?: Partial<CreativeSelections>
}

export const PROMPT_TEMPLATE_GROUPS: { id: PromptTemplateGroup; label: string }[] = [
  { id: 'product', label: 'Product' },
  { id: 'artist', label: 'Artist' },
  { id: 'brand', label: 'Brand' },
  { id: 'hype', label: 'Hype' },
]

export const AD_PROMPT_TEMPLATES: AdPromptTemplate[] = [
  {
    id: 'merch-hero-spin',
    group: 'product',
    label: 'Hero spin',
    brief:
      'Luxury merch drop: hoodie on a floating stand, slow 360 product spin, gold rim light, black void background, premium commercial polish',
    creative: { camera: 'orbit', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'product-spin' },
  },
  {
    id: 'merch-unboxing',
    group: 'product',
    label: 'Unboxing',
    brief:
      'Hands unbox a DMF exclusive drop on a dark table, tissue paper peel, gold foil logo reveal, soft studio light, clean product showcase',
    creative: {
      camera: 'push-in',
      lighting: 'soft-studio',
      mood: 'clean-product',
      pace: 'medium',
      motion: 'locked-subject',
    },
  },
  {
    id: 'logo-reveal',
    group: 'product',
    label: 'Logo reveal',
    brief:
      'Gold DMF logo materializes from smoke on black, subtle particles, sharp typography, cinematic depth, premium brand sting',
    creative: { camera: 'static', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'artist-performance',
    group: 'artist',
    label: 'Performance',
    brief:
      'Artist on stage under gold spotlights, crowd energy silhouette, mic grip, confident delivery, luxury hip-hop concert vibe',
    creative: { camera: 'low-angle', lighting: 'gold-rim', mood: 'hype', pace: 'medium', motion: 'locked-subject' },
  },
  {
    id: 'studio-session',
    group: 'artist',
    label: 'Studio session',
    brief:
      'Recording booth session: artist in headphones at the mic, moody neon accents, mixing board bokeh, intimate creative energy',
    creative: { camera: 'push-in', lighting: 'neon-night', mood: 'moody', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'street-portrait',
    group: 'artist',
    label: 'Street portrait',
    brief:
      'Night street portrait walk: confident stride past city lights, raw urban grit, gold chain catch-light, authentic street aesthetic',
    creative: { camera: 'orbit', lighting: 'neon-night', mood: 'street', pace: 'medium', motion: 'walking' },
  },
  {
    id: 'gold-rim-product',
    group: 'brand',
    label: 'Gold rim',
    brief:
      'Premium brand hero: product centered in black void with gold rim light, slow orbit, luxury hip-hop polish, magazine commercial quality',
    creative: { camera: 'orbit', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'product-spin' },
  },
  {
    id: 'night-city',
    group: 'brand',
    label: 'Night city',
    brief:
      'Luxury night city skyline reflections, gold and black color grade, slow cinematic drift, premium brand atmosphere, no text',
    creative: { camera: 'static', lighting: 'neon-night', mood: 'moody', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'slow-cinematic',
    group: 'brand',
    label: 'Slow cinematic',
    brief:
      'Slow motion cinematic brand moment: fabric ripple, gold dust in air, soft volumetric light, 24fps feel, elevated luxury mood',
    creative: { camera: 'push-in', lighting: 'soft-studio', mood: 'luxury', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'fast-cuts',
    group: 'hype',
    label: 'Fast cuts',
    brief:
      'High-energy vertical hook: rapid punchy cuts, flash accents, bold fashion details, explosive hype energy for social ads',
    creative: { camera: 'whip-pan', lighting: 'harsh-flash', mood: 'hype', pace: 'fast', motion: 'dance' },
  },
  {
    id: 'whip-pan-energy',
    group: 'hype',
    label: 'Whip-pan',
    brief:
      'Dynamic whip-pan into artist pose, kinetic blur trails, neon night glow, bold and explosive social-first energy',
    creative: { camera: 'whip-pan', lighting: 'neon-night', mood: 'hype', pace: 'fast', motion: 'locked-subject' },
  },
  {
    id: 'vertical-hook',
    group: 'hype',
    label: 'Vertical hook',
    brief:
      '9:16 vertical scroll-stopper: face close-up then pull back to full drip fit, gold accents, confident stare, TikTok-ready hook',
    creative: { camera: 'push-in', lighting: 'gold-rim', mood: 'hype', pace: 'medium', motion: 'locked-subject' },
  },
  {
    id: 'dance-energy',
    group: 'hype',
    label: 'Dance energy',
    brief:
      'Dance energy clip: rhythmic body movement under club lights, gold flashes, high-energy hip-hop vibe, locked camera framing',
    creative: { camera: 'static', lighting: 'neon-night', mood: 'hype', pace: 'fast', motion: 'dance' },
  },
  {
    id: 'sunset-walk',
    group: 'brand',
    label: 'Golden hour',
    brief:
      'Golden hour walk along the strip: warm sunset rim light, confident stride, luxury streetwear silhouette, cinematic polish',
    creative: { camera: 'orbit', lighting: 'sunset', mood: 'luxury', pace: 'medium', motion: 'walking' },
  },
]
