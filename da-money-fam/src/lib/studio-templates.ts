import type { CreativeSelections } from '@/lib/ad-creative-presets'

export type PromptTemplateGroup = 'product' | 'artist' | 'brand' | 'hype'

export interface StudioTemplate {
  id: string
  group: PromptTemplateGroup
  label: string
  tagline: string
  still: string
  video: string
  creative?: Partial<CreativeSelections>
}

export const PROMPT_TEMPLATE_GROUPS: { id: PromptTemplateGroup; label: string }[] = [
  { id: 'product', label: 'Product' },
  { id: 'artist', label: 'Artist' },
  { id: 'brand', label: 'Brand' },
  { id: 'hype', label: 'Hype' },
]

const LOCK =
  'Keep the exact person, face, body, wardrobe, jewelry, hair, and color from the reference still. Do not invent a new subject. No text, no logos, no watermark.'

/** Used when the user generates with a still and no extra prompt. */
export const FROM_STILL_VIDEO = `${LOCK} Slow luxury commercial: hold identity, subtle breath and fabric motion, gold rim light, black void, smooth orbit, 9:16, premium hip-hop polish.`

export const FROM_STILL_IMAGE = `${LOCK} Hero still: same pose and wardrobe, magazine-sharp, gold rim, black void, editorial luxury hip-hop, 9:16.`

function pair(
  stillShot: string,
  videoShot: string
): { still: string; video: string } {
  return { still: `${LOCK} ${stillShot}`, video: `${LOCK} ${videoShot}` }
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: 'merch-hero-spin',
    group: 'product',
    label: 'Hero spin',
    tagline: '360 merch in the void',
    ...pair(
      'Product-forward still: garment or item fully readable, floating stand, gold rim, black void, catalog sharpness.',
      'Luxury merch clip: hoodie or drop piece on a floating stand, slow 360 spin, gold rim, black void, fabric catch-light.'
    ),
    creative: { camera: 'orbit', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'product-spin' },
  },
  {
    id: 'merch-unboxing',
    group: 'product',
    label: 'Unboxing',
    tagline: 'Hands, tissue, reveal',
    ...pair(
      'Tabletop still: hands and drop box in frame, gold foil catch, dark wood, the same person from the still if hands/face show.',
      'Hands unbox the drop on a dark table, tissue peel, gold foil reveal, soft studio, keep the same hands and jewelry.'
    ),
    creative: {
      camera: 'push-in',
      lighting: 'soft-studio',
      mood: 'clean-product',
      pace: 'medium',
      motion: 'locked-subject',
    },
  },
  {
    id: 'logo-sting',
    group: 'product',
    label: 'End sting',
    tagline: 'Hold for closer',
    ...pair(
      'End-card still: subject and product settle, space in the lower third, gold rim, no type.',
      'End card hold: camera settles, same talent and drip, slow breathe, room for a logo later, no readable text.'
    ),
    creative: { camera: 'static', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'artist-performance',
    group: 'artist',
    label: 'Stage',
    tagline: 'Gold spots, crowd haze',
    ...pair(
      'Stage still: same artist, mic or stance from the ref, gold spotlight, crowd as silhouette only.',
      'Stage clip: same artist under gold spots, crowd energy as silhouette, confident delivery, luxury concert haze.'
    ),
    creative: { camera: 'low-angle', lighting: 'gold-rim', mood: 'hype', pace: 'medium', motion: 'locked-subject' },
  },
  {
    id: 'studio-session',
    group: 'artist',
    label: 'Booth',
    tagline: 'Headphones, neon bokeh',
    ...pair(
      'Booth still: same face in headphones, mixing-board bokeh, moody neon, intimate.',
      'Booth clip: same artist at the mic, slow push-in, headphones, neon accents, mixing board bokeh.'
    ),
    creative: { camera: 'push-in', lighting: 'neon-night', mood: 'moody', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'street-portrait',
    group: 'artist',
    label: 'Night walk',
    tagline: 'City lights, chain flash',
    ...pair(
      'Street still: same drip, night city bokeh, chain catch-light, confident stance.',
      'Night walk: same talent, confident stride, city lights, gold chain flash, urban grit, medium pace.'
    ),
    creative: { camera: 'orbit', lighting: 'neon-night', mood: 'street', pace: 'medium', motion: 'walking' },
  },
  {
    id: 'gold-rim-product',
    group: 'brand',
    label: 'Gold rim',
    tagline: 'Magazine hero',
    ...pair(
      'Centered hero still: same look, black void, gold rim, editorial sharpness.',
      'Brand hero: same subject centered, slow orbit, gold rim, black void, magazine commercial.'
    ),
    creative: { camera: 'orbit', lighting: 'gold-rim', mood: 'luxury', pace: 'slow', motion: 'product-spin' },
  },
  {
    id: 'slow-cinematic',
    group: 'brand',
    label: 'Cinematic',
    tagline: 'Fabric, gold dust',
    ...pair(
      'Cinematic still: fabric drape, gold dust in air, volumetric light, same person.',
      'Slow-mo brand moment: fabric ripple, gold dust, volumetric light, 24fps feel, same identity.'
    ),
    creative: { camera: 'push-in', lighting: 'soft-studio', mood: 'luxury', pace: 'slow', motion: 'locked-subject' },
  },
  {
    id: 'sunset-walk',
    group: 'brand',
    label: 'Golden hour',
    tagline: 'Warm rim, streetwear',
    ...pair(
      'Golden-hour still: warm sunset rim, same silhouette and fit, cinematic.',
      'Golden hour walk: warm sunset rim, confident stride, luxury streetwear, same talent.'
    ),
    creative: { camera: 'orbit', lighting: 'sunset', mood: 'luxury', pace: 'medium', motion: 'walking' },
  },
  {
    id: 'vertical-hook',
    group: 'hype',
    label: 'Hook',
    tagline: 'Face then full drip',
    ...pair(
      '9:16 still: tight on the same face, drip readable, gold accents, stare into lens.',
      '9:16 hook: face close-up then pull back to full drip, same person, gold accents, scroll-stopper.'
    ),
    creative: { camera: 'push-in', lighting: 'gold-rim', mood: 'hype', pace: 'medium', motion: 'locked-subject' },
  },
  {
    id: 'whip-pan-energy',
    group: 'hype',
    label: 'Whip',
    tagline: 'Blur into pose',
    ...pair(
      'Freeze still: the landing pose from the ref, neon night, sharp after implied motion.',
      'Whip-pan into the same pose, kinetic blur then lock, neon night, explosive social energy.'
    ),
    creative: { camera: 'whip-pan', lighting: 'neon-night', mood: 'hype', pace: 'fast', motion: 'locked-subject' },
  },
  {
    id: 'dance-energy',
    group: 'hype',
    label: 'Dance',
    tagline: 'Club lights, rhythm',
    ...pair(
      'Dance still: mid-move, same fit, club gold flashes, locked framing.',
      'Dance clip: rhythmic movement, same talent, club lights, gold flashes, locked camera.'
    ),
    creative: { camera: 'static', lighting: 'neon-night', mood: 'hype', pace: 'fast', motion: 'dance' },
  },
]

/** @deprecated Use STUDIO_TEMPLATES */
export type AdPromptTemplate = StudioTemplate
export const AD_PROMPT_TEMPLATES = STUDIO_TEMPLATES
