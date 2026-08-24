import type { SeedanceModelKey } from '@/lib/seedance-models'
import type { ImageTier } from '@/lib/image-models'

/** Pre-cut list prices shown with red strikethrough in Ad Studio UI. */
export const LEGACY_VIDEO_BASE: Partial<Record<SeedanceModelKey, number>> = {
  lite: 20,
  fast: 40,
}

export const LEGACY_IMAGE_BASE: Record<ImageTier, number> = {
  draft: 4,
  fast: 4,
  edit: 6,
  smart: 10,
}

export const VIDEO_VOLUME_MIN: Record<SeedanceModelKey, number> = {
  lite: 6,
  mini: 8,
  fast: 16,
}

export function legacyVideoPrice(
  modelKey: SeedanceModelKey,
  durationSeconds: number = 6
): number | null {
  const base = LEGACY_VIDEO_BASE[modelKey]
  if (base == null) return null
  const duration = durationSeconds > 0 ? durationSeconds : 6
  return Math.max(1, Math.ceil(base * (duration / 6)))
}

export function videoVolumeFloor(
  modelKey: SeedanceModelKey,
  durationSeconds: number = 6
): number {
  const duration = durationSeconds > 0 ? durationSeconds : 6
  return Math.max(1, Math.ceil(VIDEO_VOLUME_MIN[modelKey] * (duration / 6)))
}
