import { NextResponse } from 'next/server'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { getCurrentUser } from '@/lib/auth/user'
import { getFanSubscription } from '@/lib/fan-club'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getFanSubscription(user.id)
    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${siteUrl}/account`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    const message = error instanceof Error ? error.message : 'Failed to open billing portal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
