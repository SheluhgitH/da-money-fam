import { NextResponse } from 'next/server'
import { getBundle } from '@/lib/bundles'
import { getSongById } from '@/lib/store'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserOwnedSongIds } from '@/lib/user-store'
import { getReferralCookie } from '@/lib/referrals'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout-bundle:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { bundle_id } = await req.json()
    if (!bundle_id) {
      return NextResponse.json({ error: 'bundle_id is required' }, { status: 400 })
    }

    const bundle = getBundle(String(bundle_id))
    if (!bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 })
    }

    const songs = await Promise.all(bundle.song_ids.map((id) => getSongById(id)))
    if (songs.some((s) => !s || !s.is_published || s.for_sale === false)) {
      return NextResponse.json({ error: 'One or more tracks in this bundle are unavailable' }, { status: 403 })
    }

    const user = await getCurrentUser()
    if (user) {
      const owned = await getUserOwnedSongIds(user.id)
      if (bundle.song_ids.some((id) => owned.includes(id))) {
        return NextResponse.json({ error: 'You already own a track in this bundle' }, { status: 403 })
      }
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const referral = await getReferralCookie()

    const metadata: Record<string, string> = {
      type: 'bundle_purchase',
      bundle_id: bundle.id,
      bundle_name: bundle.name,
      song_ids: bundle.song_ids.join(','),
      price: String(bundle.price),
    }
    if (user) metadata.user_id = user.id
    if (referral) metadata.referrer_id = referral

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.name,
              description: bundle.description,
            },
            unit_amount: Math.round(bundle.price * 100),
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${siteUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: 'store', checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Bundle checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
