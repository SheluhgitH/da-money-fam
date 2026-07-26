type EnvIssue = {
  variable: string
  severity: 'error' | 'warning'
  message: string
}

const DEFAULT_ADMIN_PASSWORD = 'dmf-admin-2026'
const DEFAULT_ADMIN_SESSION = 'dmf-session-secret'
const PLACEHOLDER_WEBHOOK = 'your_stripe_webhook_secret_here'
const PLACEHOLDER_FAN_CLUB_PRICE = 'your_fan_club_price_id_here'

export function getProductionEnvIssues(): EnvIssue[] {
  if (process.env.NODE_ENV !== 'production') return []

  const issues: EnvIssue[] = []
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    issues.push({
      variable: 'NEXT_PUBLIC_SITE_URL',
      severity: 'error',
      message: 'Missing site URL — Stripe redirects and auth callbacks will fail.',
    })
  } else if (!siteUrl.startsWith('https://')) {
    issues.push({
      variable: 'NEXT_PUBLIC_SITE_URL',
      severity: 'error',
      message: 'Must use https:// for production (e.g. https://damoneyfam.com).',
    })
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push({
      variable: 'SUPABASE_SERVICE_ROLE_KEY',
      severity: 'error',
      message:
        'Auth may work but profiles, comments, favorites, and library will fall back to local JSON.',
    })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push({
      variable: 'STRIPE_SECRET_KEY',
      severity: 'error',
      message: 'Checkout and webhooks are disabled without Stripe secret key.',
    })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET === PLACEHOLDER_WEBHOOK) {
    issues.push({
      variable: 'STRIPE_WEBHOOK_SECRET',
      severity: 'error',
      message: 'Purchases will not unlock library or record merch orders.',
    })
  }

  const fanClubPrice = process.env.STRIPE_FAN_CLUB_PRICE_ID
  if (!fanClubPrice || fanClubPrice === PLACEHOLDER_FAN_CLUB_PRICE || fanClubPrice === 'price_your_fan_club_price_id_here') {
    issues.push({
      variable: 'STRIPE_FAN_CLUB_PRICE_ID',
      severity: 'warning',
      message: 'Fan Club subscriptions are disabled until a live recurring price ID is set.',
    })
  }

  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    issues.push({
      variable: 'ADMIN_PASSWORD',
      severity: 'warning',
      message: 'Using default admin password — set a strong value on Vercel.',
    })
  }

  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET === DEFAULT_ADMIN_SESSION) {
    issues.push({
      variable: 'ADMIN_SESSION_SECRET',
      severity: 'warning',
      message: 'Using default admin session secret — set a random 32+ char value.',
    })
  }

  return issues
}

export function logProductionEnvIssues(): void {
  const issues = getProductionEnvIssues()
  for (const issue of issues) {
    const prefix = `[DMF env ${issue.severity}] ${issue.variable}:`
    if (issue.severity === 'error') {
      console.error(prefix, issue.message)
    } else {
      console.warn(prefix, issue.message)
    }
  }
}
