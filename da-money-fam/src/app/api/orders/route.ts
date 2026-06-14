import { NextResponse } from 'next/server'
import { createOrder } from '@/lib/store'
import { orderSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`order:${ip}`, 5, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    await orderSchema.validate(body)

    const order = await createOrder({
      song_id: body.song_id,
      buyer_email: body.buyer_email,
      buyer_name: body.buyer_name,
      payment_proof: body.payment_proof,
      payment_method: body.payment_method,
    })

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          song_title: order.song_title,
        },
        message:
          'Order received! We will verify your payment and email your download link within 24 hours.',
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit order' },
      { status: 400 }
    )
  }
}
