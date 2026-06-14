import { NextResponse } from 'next/server'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'

const COIN_PACKAGES = [
  { id: 'small', amount: 100, price: 10.00 },
  { id: 'medium', amount: 500, price: 45.00 },
  { id: 'large', amount: 1000, price: 80.00 },
]

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`coin-purchase:${ip}`, 5, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { package_id } = await req.json()

    if (!package_id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
    }

    const coinPackage = COIN_PACKAGES.find((p) => p.id === package_id)
    if (!coinPackage) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const unitAmount = Math.round(coinPackage.price * 100)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${coinPackage.amount} DMF Coinz`,
              description: `Purchase ${coinPackage.amount} DMF Coinz`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        coin_amount: String(coinPackage.amount),
        type: 'coin_purchase',
      },
      success_url: `${siteUrl}/account?status=success`,
      cancel_url: `${siteUrl}/account?status=cancelled`,
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Coin purchase checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = message.includes('Payments are temporarily unavailable') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
