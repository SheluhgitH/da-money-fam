/**
 * Stripe checkout return URLs must use query params — hashes are often stripped on redirect.
 * `from=stripe` marks external returns so the client can bust bfcache and scroll reliably.
 */
export function stripeHomeReturnUrl(
  siteUrl: string,
  options: {
    section: string
    checkout?: 'success' | 'cancel'
    includeSessionId?: boolean
  }
): string {
  const base = siteUrl.replace(/\/$/, '')
  const url = new URL(base)
  url.searchParams.set('section', options.section)
  url.searchParams.set('from', 'stripe')
  if (options.checkout) {
    url.searchParams.set('checkout', options.checkout)
  }
  let href = url.toString()
  if (options.includeSessionId) {
    href += `${href.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
  }
  return href
}
