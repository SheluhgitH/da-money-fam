export type EditStrength = 'subtle' | 'medium' | 'heavy'

const STRENGTH_LOCK: Record<EditStrength, string> = {
  subtle:
    'Strength: SUBTLE. Change only the named detail. Keep camera, framing, background, pose, body, wardrobe, props, and lighting identical unless that part is named. Almost never restyle the room.',
  medium:
    'Strength: MEDIUM. Apply the named change clearly. Keep unspecified parts of the scene the same.',
  heavy:
    'Strength: HEAVY. The named change may restyle lighting, wardrobe, or background if needed to complete the request. Still keep the same subject identity unless the change names a new person.',
}

/** Prefix so edit models mutate the still instead of inventing a new scene. */
export function wrapImageEditPrompt(
  userText: string,
  strength: EditStrength = 'medium'
): string {
  const change = userText.trim() || 'Subtle polish only.'
  return [
    'IMAGE EDIT of the provided reference still. Do not generate a new scene or a new photoshoot.',
    STRENGTH_LOCK[strength] || STRENGTH_LOCK.medium,
    `Only apply this change: ${change}`,
    'Do not restyle the whole image unless strength is HEAVY and the change requires it. No text, no watermark.',
  ].join(' ')
}

export function wrapInpaintPrompt(userText: string, strength: EditStrength = 'medium'): string {
  const change = userText.trim() || 'Edit the painted region only.'
  return [
    'INPAINT: The second reference is a mask. White pixels = change. Black pixels = keep identical.',
    'Modify only the white-masked region. Leave every black pixel unchanged — same wardrobe, background, face, and lighting outside the mask.',
    wrapImageEditPrompt(change, strength),
  ].join(' ')
}

export const EDIT_LOCK_CHIPS: { id: string; label: string; extra: string }[] = [
  {
    id: 'face',
    label: 'Face only',
    extra: 'Change only the face. Keep body, clothes, pose, and background identical.',
  },
  {
    id: 'outfit',
    label: 'Outfit only',
    extra: 'Change only clothing. Keep face, pose, body, lighting, and background identical.',
  },
  {
    id: 'light',
    label: 'Light only',
    extra: 'Change only lighting and color grade. Keep subject, pose, clothes, and background identical.',
  },
  {
    id: 'bg',
    label: 'Background only',
    extra: 'Change only the background. Keep the subject, pose, face, and clothes identical.',
  },
]
