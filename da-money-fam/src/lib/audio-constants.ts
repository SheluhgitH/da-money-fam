export const PREVIEW_DURATION_SEC = 25
/** Enough for ~25s at 320kbps with headroom (512KB was only ~12–16s for mastered MP3s). */
export const PREVIEW_MAX_BYTES = Math.ceil((320 * 1000) / 8 * PREVIEW_DURATION_SEC * 1.3)
