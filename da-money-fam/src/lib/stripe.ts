import Stripe from 'stripe'

const PLACEHOLDER_KEYS = [
  'your_stripe_secret_key_here',
  'your_new_stripe_secret_key_here',
  'your_stripe_publishable_key_here',
]

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return false
  if (PLACEHOLDER_KEYS.some((p) => key.includes(p))) return false
  return key.startsWith('sk_')
}

export function getStripeConfigError(): string {
  return 'Payments are temporarily unavailable. Add valid Stripe test keys to .env.local and restart the dev server.'
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error(getStripeConfigError())
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  })
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
}
