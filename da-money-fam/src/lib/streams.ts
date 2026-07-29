export const KICK_CHANNEL_SLUG = 'jackpotwrld'

export const STREAMS_CONFIG = {
  kickChannelUrl: `https://kick.com/${KICK_CHANNEL_SLUG}`,
  kickstarterTitle: 'Jackpotwrld',
  kickstarterTagline: 'Support JackPot & the DMF movement — back the Jackpotwrld project on Kickstarter.',
  /** Set NEXT_PUBLIC_KICKSTARTER_URL in .env.local when the campaign is live */
  kickstarterUrl:
    process.env.NEXT_PUBLIC_KICKSTARTER_URL?.trim() || '',
}

export type KickVideo = {
  id: string
  vodId?: string
  title: string
  category: string
  thumbnail: string
  durationMs: number
  views: number
  createdAt: string
  watchUrl: string
}

/** Kick VOD pages require vod_id in the URL — never use session slug. */
export function buildKickWatchUrl(vodId: string): string {
  return `https://kick.com/${KICK_CHANNEL_SLUG}/videos/${vodId}`
}

export function formatStreamDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T') + 'Z')
  const diffMs = Date.now() - date.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const KICK_IMAGE_HOSTS = new Set(['images.kick.com', 'files.kick.com'])

/** Kick CDN blocks some browser hotlinks — load via same-origin proxy instead. */
export function kickThumbnailSrc(url: string): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    if (KICK_IMAGE_HOSTS.has(parsed.hostname)) {
      return `/api/kick/thumbnail?url=${encodeURIComponent(url)}`
    }
  } catch {
    return url
  }
  return url
}
