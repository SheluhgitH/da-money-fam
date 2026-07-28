import Stripe from 'stripe'
import { getSiteUrl } from './site-url'

const PLACEHOLDER_KEYS = [
  'your_stripe_secret_key_here',
  'your_new_stripe_secret_key_here',
  'your_stripe_publishable_key_here',
  'your_stripe_webhook_secret_here',
]

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return false
  if (PLACEHOLDER_KEYS.some((p) => key.includes(p))) return false
  return key.startsWith('sk_')
}

export function isStripeLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY
  return Boolean(key?.startsWith('sk_live_'))
}

export function getStripeConfigError(): string {
  if (isStripeLiveMode()) {
    return 'Payments are temporarily unavailable. Check live Stripe keys and webhook on Vercel.'
  }
  return 'Payments are temporarily unavailable. Add valid Stripe keys to .env.local (or Vercel env) and restart.'
}

export function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error(getStripeConfigError())
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  })
}

export { getSiteUrl } from './site-url'
