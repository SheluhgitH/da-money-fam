import { NextResponse } from 'next/server'
import { getSongById } from '@/lib/store'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats } from '@/lib/user-store'
import { getReferralCookie } from '@/lib/referrals'

const LEVEL3_DISCOUNT_PERCENT = 10

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { song_id } = await req.json()

    if (!song_id) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    if (song.for_sale === false) {
      return NextResponse.json({ error: 'This track is exclusive and not available for purchase yet' }, { status: 403 })
    }

    const user = await getCurrentUser()
    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const referral = await getReferralCookie()

    let unitAmount = Math.round(song.price * 100)
    let discountNote = ''

    if (user) {
      const stats = await getUserStats(user.id)
      if (stats.level >= 3) {
        unitAmount = Math.round(unitAmount * (1 - LEVEL3_DISCOUNT_PERCENT / 100))
        discountNote = ` — ${LEVEL3_DISCOUNT_PERCENT}% Level ${stats.level} fan discount`
      }
    }

    const metadata: Record<string, string> = {
      type: 'song_purchase',
      song_id: song.id,
      song_title: song.title,
    }
    if (user) {
      metadata.user_id = user.id
    }
    if (referral) {
      metadata.referrer_id = referral
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${song.title} — ${song.artist}${discountNote}`,
              description: `Digital download: ${song.title}`,
            },
            unit_amount: unitAmount,
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
    console.error('Checkout create error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = message.includes('Payments are temporarily unavailable') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
