import { NextResponse } from 'next/server'
import { getServicePackage } from '@/lib/service-packages'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout-services:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { package_slug } = await req.json()
    if (!package_slug) {
      return NextResponse.json({ error: 'package_slug is required' }, { status: 400 })
    }

    const pkg = getServicePackage(String(package_slug))
    if (!pkg) {
      return NextResponse.json({ error: 'Service package not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    const stripe = getStripe()
    const siteUrl = getSiteUrl()

    const metadata: Record<string, string> = {
      type: 'service_deposit',
      package_slug: pkg.slug,
      package_name: pkg.title,
      price: String(pkg.depositAmount),
    }
    if (user) metadata.user_id = user.id

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.title} — 50% Deposit`,
              description: `${pkg.description} Full project: $${pkg.fullPrice}. Deposit due now: $${pkg.depositAmount}.`,
            },
            unit_amount: Math.round(pkg.depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${siteUrl}/services/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: 'video-editing', checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Service checkout error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
