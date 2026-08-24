import { wrapImageEditPrompt } from '@/lib/image-edit-prompt'

export interface CharacterStyle {
  id: string
  label: string
  prompt: string
}

export const CHARACTER_STYLES: CharacterStyle[] = [
  {
    id: 'photoreal',
    label: 'Photoreal',
    prompt:
      'Photoreal character sheet, natural skin, studio lighting, full body plus close-up face, consistent identity, fashion editorial clarity, no text, no watermark.',
  },
  {
    id: 'anime',
    label: 'Anime',
    prompt:
      'Anime character sheet, clean linework, expressive eyes, consistent face and outfit, turnaround-ready, vibrant but controlled palette, no text.',
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    prompt:
      'Streetwear character sheet, oversized fits, sneakers, urban night lighting, confident pose, consistent identity, cinematic still, no text.',
  },
  {
    id: 'luxury',
    label: 'Luxury editorial',
    prompt:
      'Luxury editorial character sheet, couture styling, gold and black palette, high-fashion posing, magazine lighting, consistent identity, no text.',
  },
  {
    id: 'clay',
    label: '3D clay',
    prompt:
      '3D clay character sheet, soft sculpted surfaces, studio product lighting, toy-like but detailed face, consistent identity, no text.',
  },
  {
    id: 'comic',
    label: 'Comic',
    prompt:
      'Comic-book character sheet, bold ink outlines, halftone shading, dynamic pose, consistent identity, print-ready colors, no text.',
  },
]

export function getCharacterStyle(id: string | null | undefined): CharacterStyle {
  return CHARACTER_STYLES.find((s) => s.id === id) || CHARACTER_STYLES[0]
}

export function characterSheetPrompt(input: {
  name: string
  styleId: string
  extra?: string
}): string {
  const style = getCharacterStyle(input.styleId)
  const extra = input.extra?.trim() ? ` ${input.extra.trim()}` : ''
  return `Create a consistent character named ${input.name}. ${style.prompt}${extra} Show a full-body look and a face close-up on one sheet, same person, same outfit.`
}

export function characterRemixLookPrompt(input: { name: string; extra?: string }): string {
  const extra = input.extra?.trim()
  const instruction = extra || 'Subtle polish on outfit and lighting only.'
  return wrapImageEditPrompt(
    `${instruction} Keep character ${input.name} the same identity and the same face. Do not change pose, body, background, or framing.`
  )
}

export function characterRandomizeFacePrompt(input: { name: string; extra?: string }): string {
  const extra = input.extra?.trim()
  const identity = extra
    ? `New face must match: ${extra}`
    : 'Invent a new distinct face (ethnicity, age, and features may change). Do not keep the previous identity.'
  return wrapImageEditPrompt(
    `Replace only the face. Keep outfit, pose, body, lighting, background, and framing pixel-consistent. ${identity} Character tag ${input.name}.`
  )
}
