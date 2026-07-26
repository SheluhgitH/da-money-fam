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

    if (result.type !== 'merch_purchase' && result.type !== 'cart_purchase') {
      return NextResponse.json({ error: 'Not a merch purchase session' }, { status: 400 })
    }

    if (result.type === 'cart_purchase' && !result.has_merch) {
      return NextResponse.json({ error: 'Not a merch purchase session' }, { status: 400 })
    }

    return NextResponse.json({
      merch_name:
        result.type === 'cart_purchase'
          ? 'Cart merch order'
          : session.metadata?.merch_name || 'Merch order',
      order_id: 'order_id' in result ? result.order_id : result.order_ids?.[0],
      order_ids: 'order_ids' in result ? result.order_ids : undefined,
      analytics: getStripePurchaseAnalytics(session),
    })
  } catch (error) {
    console.error('Merch verify error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    )
  }
}
