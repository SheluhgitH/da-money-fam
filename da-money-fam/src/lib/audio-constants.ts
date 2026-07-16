export const PREVIEW_DURATION_SEC = 25
export const FAN_CLUB_PREVIEW_DURATION_SEC = 60
/** Enough for ~25s at 320kbps with headroom (512KB was only ~12–16s for mastered MP3s). */
export const PREVIEW_MAX_BYTES = Math.ceil((320 * 1000) / 8 * PREVIEW_DURATION_SEC * 1.3)

/** Pause every other <audio> on the page to prevent overlapping playback / echo. */
export function pauseAllExceptAudio(active: HTMLAudioElement) {
  if (typeof document === 'undefined') return
  document.querySelectorAll('audio').forEach((el) => {
    if (el !== active && !el.paused) {
      el.pause()
    }
  })
}
