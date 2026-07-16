import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { fulfillStripeSession, handleSubscriptionUpdated } from '@/lib/stripe-fulfillment'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || webhookSecret === 'your_stripe_webhook_secret_here') {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      await fulfillStripeSession(session)
    } catch (error) {
      console.error('Webhook fulfillment error:', error)
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await handleSubscriptionUpdated(subscription)
    } catch (error) {
      console.error('Subscription webhook error:', error)
      return NextResponse.json({ error: 'Subscription update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
