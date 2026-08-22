import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAllOrders } from '@/lib/store'
import { getSiteUrl } from '@/lib/site-url'
import { sendOrderThankYouEmail } from '@/lib/email'
import { writeAdminAudit } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = checkRateLimit('admin-order-thank-you', 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const id = String(body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Order id is required' }, { status: 400 })

    const orders = await getAllOrders()
    const order = orders.find((o) => o.id === id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!order.buyer_email) {
      return NextResponse.json({ error: 'Order has no buyer email' }, { status: 400 })
    }

    const downloadUrl = order.download_token
      ? `${getSiteUrl()}/api/download/${order.download_token}`
      : null

    const result = await sendOrderThankYouEmail({
      type: 'song',
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      itemName: order.song_title,
      downloadUrl,
    })

    if (!result.sent) {
      return NextResponse.json(
        { error: 'Email not configured (RESEND_API_KEY)' },
        { status: 503 }
      )
    }

    await writeAdminAudit({
      action: 'thank_you_email',
      entity: 'purchase_order',
      entityId: id,
      payload: { type: 'song', email: order.buyer_email },
    })

    return NextResponse.json({ ok: true, sent: true })
  } catch (error) {
    console.error('POST /api/admin/orders/thank-you:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send thank you' },
      { status: 500 }
    )
  }
}
