import { NextResponse } from 'next/server'
import { getMerchItem, isValidMerchSize, canPurchaseMerch } from '@/lib/merch'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats } from '@/lib/user-store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { levelFromXp } from '@/lib/fan-perks'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout-merch:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { merch_id, size } = await req.json()

    if (!merch_id) {
      return NextResponse.json({ error: 'merch_id is required' }, { status: 400 })
    }

    if (!size || typeof size !== 'string') {
      return NextResponse.json({ error: 'size is required (S, M, L, or XL)' }, { status: 400 })
    }

    const item = getMerchItem(String(merch_id))
    if (!item) {
      return NextResponse.json({ error: 'Merch item not found' }, { status: 404 })
    }

    if (!isValidMerchSize(size, item)) {
      return NextResponse.json({ error: 'Invalid size for this item' }, { status: 400 })
    }

    const user = await getCurrentUser()
    const stats = user ? await getUserStats(user.id) : null
    const fanClub = user ? await isActiveFanClubMember(user.id) : false
    const level = stats ? levelFromXp(stats.xp) : 1

    if (!canPurchaseMerch(item, new Date(), level, fanClub)) {
      return NextResponse.json(
        { error: 'This item is in Fan Club / Level 5 presale' },
        { status: 403 }
      )
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const unitAmount = Math.round(item.price * 100)

    const metadata: Record<string, string> = {
      type: 'merch_purchase',
      merch_id: item.id,
      merch_name: item.name,
      price: String(item.price),
      size,
    }
    if (user) {
      metadata.user_id = user.id
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${item.name} — Size ${size}`,
              description: `DMF 1-of-1 merchandise — ${item.category}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: stripeHomeReturnUrl(siteUrl, {
        section: 'merch',
        checkout: 'success',
        includeSessionId: true,
      }),
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: 'merch', checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Merch checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = message.includes('Payments are temporarily unavailable') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
