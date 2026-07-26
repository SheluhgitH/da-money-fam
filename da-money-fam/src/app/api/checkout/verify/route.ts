import { NextResponse } from 'next/server'
import { getStripe, getSiteUrl } from '@/lib/stripe'
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
    const siteUrl = getSiteUrl()
    const analytics = getStripePurchaseAnalytics(session)

    if (result.type === 'bundle_purchase' && 'download_token' in result) {
      return NextResponse.json({
        song_title: result.song_title,
        download_url: `${siteUrl}/api/download/${result.download_token}`,
        order_ids: result.order_ids,
        is_bundle: true,
        analytics,
      })
    }

    if (result.type === 'cart_purchase') {
      const downloadToken =
        'download_token' in result && result.download_token ? result.download_token : null
      return NextResponse.json({
        song_title: result.song_title,
        download_url: downloadToken ? `${siteUrl}/api/download/${downloadToken}` : null,
        order_ids: result.order_ids,
        is_bundle: Boolean(result.has_songs && (result.order_ids?.length ?? 0) > 1),
        is_cart: true,
        has_merch: result.has_merch,
        analytics,
      })
    }

    if (result.type !== 'song_purchase' || !('download_token' in result)) {
      return NextResponse.json({ error: 'Not a song purchase session' }, { status: 400 })
    }

    return NextResponse.json({
      song_title: result.song_title,
      download_url: `${siteUrl}/api/download/${result.download_token}`,
      order_id: result.order_id,
      analytics,
    })
  } catch (error) {
    console.error('Checkout verify error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    )
  }
}
