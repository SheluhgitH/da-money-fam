import { NextResponse } from 'next/server'
import { getSongById } from '@/lib/store'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'

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

    const user = await getCurrentUser()
    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const unitAmount = Math.round(song.price * 100)

    const metadata: Record<string, string> = {
      song_id: song.id,
      song_title: song.title,
    }
    if (user) {
      metadata.user_id = user.id
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
              name: `${song.title} — ${song.artist}`,
              description: `Digital download: ${song.title}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${siteUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#store`,
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
