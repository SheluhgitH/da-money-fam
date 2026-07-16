import { NextResponse } from 'next/server'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { isActiveFanClubMember } from '@/lib/fan-club'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout-subscribe:${ip}`, 5, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in to join the Fan Club' }, { status: 401 })
    }

    const priceId = process.env.STRIPE_FAN_CLUB_PRICE_ID
    if (!priceId || priceId === 'your_fan_club_price_id_here') {
      return NextResponse.json(
        { error: 'Fan Club is not configured yet. Set STRIPE_FAN_CLUB_PRICE_ID.' },
        { status: 503 }
      )
    }

    if (await isActiveFanClubMember(user.id)) {
      return NextResponse.json({ error: 'You already have an active Fan Club membership' }, { status: 403 })
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: 'fan_club_subscription',
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          type: 'fan_club_subscription',
          user_id: user.id,
        },
      },
      success_url: `${siteUrl}/account?fan_club=success`,
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: 'reputation', checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Fan club subscribe error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
