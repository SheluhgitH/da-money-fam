/** Shared continuity / realism guidance for multi-scene Seedance storyboards. */
export const STORYBOARD_PHYSICS_SUFFIX =
  'Maintain physical realism: solid objects occlude the body; no limbs or torso passing through furniture, trees, railings, or props. Feet stay on ground plane when walking; respect depth and collision with the environment.'

export const STORYBOARD_WALKING_SUFFIX =
  'Natural walking gait with a clear path that avoids obstacles; no clipping through static props.'

export function appendStoryboardContinuity(
  brief: string,
  opts?: { walking?: boolean }
): string {
  const parts = [brief.trim(), STORYBOARD_PHYSICS_SUFFIX]
  if (opts?.walking) parts.push(STORYBOARD_WALKING_SUFFIX)
  return parts.filter(Boolean).join(' ')
}
