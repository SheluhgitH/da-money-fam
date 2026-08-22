export interface GtaImageStyle {
  id: string
  label: string
  era: string
  prompt: string
  /** CSS color for card accent gradient */
  accent: string
}

export const GTA_IMAGE_STYLES: GtaImageStyle[] = [
  {
    id: 'gta-1',
    label: 'GTA 1',
    era: '1997 · Top-down pixel',
    accent: '#3d8b3d',
    prompt:
      'Transform the photo into a GTA 1 retro top-down pixel art style, gritty 90s crime aesthetic, low-resolution sprites, harsh shadows, saturated primary colors, simple blocky character design, minimal facial detail, overhead city grid, arcade-like vibe.',
  },
  {
    id: 'gta-2',
    label: 'GTA 2',
    era: '1999 · Retro noir',
    accent: '#c44cff',
    prompt:
      'Convert the photo into GTA 2 dystopian retro-futuristic style, neon signs, industrial grime, metallic reflections, dark noir palette, pixel-enhanced shading, overhead perspective, cyber-punk crime energy.',
  },
  {
    id: 'gta-iii',
    label: 'GTA III',
    era: '2001 · Early 3D grit',
    accent: '#6b7a8a',
    prompt:
      'Turn the photo into GTA III early-2000s 3D render style, chunky polygon modeling, low-poly facial structure, muted Liberty City palette, foggy atmosphere, sharp shadows, grainy textures, iconic comic-book outline.',
  },
  {
    id: 'vice-city',
    label: 'Vice City',
    era: '2002 · Neon Miami 80s',
    accent: '#ff2d95',
    prompt:
      'Transform the photo into GTA Vice City 80s neon Miami style, pink-blue neon glow, palm trees, sunset gradients, glossy highlights, retro fashion tones, cinematic nightlife lighting, soft pastel reflections.',
  },
  {
    id: 'san-andreas',
    label: 'San Andreas',
    era: '2004 · West Coast',
    accent: '#c4a35a',
    prompt:
      'Convert the photo into GTA San Andreas early-2000s West Coast street style, warm desert tones, gang-era aesthetic, graffiti accents, bold comic outlines, slightly exaggerated proportions, green-brown palette, gritty hood vibe.',
  },
  {
    id: 'gta-iv',
    label: 'GTA IV',
    era: '2008 · Gritty realism',
    accent: '#4a5f73',
    prompt:
      'Turn the photo into GTA IV hyper-gritty realism, desaturated cold tones, heavy shadows, detailed skin texture, urban decay background, cinematic depth, grainy film look, serious Liberty City mood.',
  },
  {
    id: 'gta-v',
    label: 'GTA V',
    era: '2013 · Polished realism',
    accent: '#ff8c2a',
    prompt:
      'Transform the photo into GTA V next-gen realism, vibrant California lighting, crisp high-detail textures, dynamic rim light, saturated highlights, glossy reflections, polished AAA rendering, Los Santos vibe.',
  },
  {
    id: 'gta-online',
    label: 'GTA Online',
    era: '2013–2024 · Flashy',
    accent: '#ffd700',
    prompt:
      'Convert the photo into GTA Online flashy high-contrast style, neon accents, luxury aesthetic, exaggerated shine, futuristic weapons/vehicles, vibrant nightclub lighting, ultra-clean rendering, chaotic energy.',
  },
  {
    id: 'trilogy-de',
    label: 'Trilogy DE',
    era: '2021 · Cartoon realism',
    accent: '#5ec8ff',
    prompt:
      'Transform the photo into GTA Trilogy Definitive Edition cartoon-realism style, smooth surfaces, bright colors, soft shadows, stylized outlines, polished remaster glow, enhanced lighting, semi-toon shading.',
  },
  {
    id: 'gta-vi',
    label: 'GTA VI',
    era: '2025 · Neon cinematic',
    accent: '#00e5c0',
    prompt:
      'Convert the photo into GTA VI ultra-realistic next-gen Rockstar aesthetic, neon-lit Miami palette, dynamic rim lighting, hyper-detailed skin texture, glossy highlights, vibrant nightlife glow, cinematic depth, AAA open-world polish.',
  },
  {
    id: 'gta-6-portrait',
    label: 'GTA 6 Portrait',
    era: 'Portrait · Rockstar',
    accent: '#ff4d8d',
    prompt:
      'Transform the character in the photo into a GTA 6 style portrait, ultra-realistic Rockstar Games aesthetic, neon-lit Miami-inspired color palette, sharp next-gen rendering, detailed skin texture, glossy highlights, dynamic rim lighting, subtle grain, high-contrast shadows, stylized open-world vibe, dramatic pose, vibrant environment glow, polished AAA game look.',
  },
]

export function getGtaStyle(id: string): GtaImageStyle | undefined {
  return GTA_IMAGE_STYLES.find((s) => s.id === id)
}
