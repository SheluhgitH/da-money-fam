export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.NODE_ENV === 'production') return 'https://damoneyfam.com'
  return 'http://localhost:3005'
}

export function getAuthCallbackUrl(redirectPath: string): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com')

  const safeRedirect = redirectPath.startsWith('/') ? redirectPath : '/'
  return `${origin}/auth/callback?redirect=${encodeURIComponent(safeRedirect)}`
}
