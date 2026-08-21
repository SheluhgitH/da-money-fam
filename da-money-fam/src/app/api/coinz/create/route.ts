import { NextResponse } from 'next/server'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { sanitizeCoinReturnPath } from '@/lib/coin-packages'
import { getResolvedCoinPackage } from '@/lib/site-settings'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`coin-purchase:${ip}`, 5, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { package_id, return_path } = body

    if (!package_id) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
    }

    const coinPackage = await getResolvedCoinPackage(package_id)
    if (!coinPackage) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const returnPath = sanitizeCoinReturnPath(return_path)
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
              description: `${coinPackage.label}: ${coinPackage.amount} Coinz · ≈ ${coinPackage.liteAds} Lite · ${coinPackage.fastAds} Fast · ${coinPackage.draftImages ?? Math.floor(coinPackage.amount / 4)} Draft imgs`,
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
      success_url: `${siteUrl}${returnPath}?status=success`,
      cancel_url: `${siteUrl}${returnPath}?status=cancelled`,
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
