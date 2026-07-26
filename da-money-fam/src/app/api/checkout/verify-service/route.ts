import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { fulfillStripeSession } from '@/lib/stripe-fulfillment'
import { getStripePurchaseAnalytics } from '@/lib/stripe-analytics'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const result = await fulfillStripeSession(session)

    if (result.type !== 'service_deposit') {
      return NextResponse.json({ error: 'Not a service deposit session' }, { status: 400 })
    }

    return NextResponse.json({
      package_name: session.metadata?.package_name || 'Service package',
      order_id: result.order_id,
      analytics: getStripePurchaseAnalytics(session),
    })
  } catch (error) {
    console.error('Service verify error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    )
  }
}
