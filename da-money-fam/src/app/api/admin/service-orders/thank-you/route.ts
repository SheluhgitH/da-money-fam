import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAllServiceOrders } from '@/lib/store'
import { sendOrderThankYouEmail } from '@/lib/email'
import { writeAdminAudit } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rate = checkRateLimit('admin-service-thank-you', 30, 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const id = String(body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Order id is required' }, { status: 400 })

    const orders = await getAllServiceOrders()
    const order = orders.find((o) => o.id === id)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!order.buyer_email) {
      return NextResponse.json({ error: 'Order has no buyer email' }, { status: 400 })
    }

    const result = await sendOrderThankYouEmail({
      type: 'service',
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name,
      itemName: order.package_name,
    })

    if (!result.sent) {
      return NextResponse.json(
        { error: 'Email not configured (RESEND_API_KEY)' },
        { status: 503 }
      )
    }

    await writeAdminAudit({
      action: 'thank_you_email',
      entity: 'service_order',
      entityId: id,
      payload: { type: 'service', email: order.buyer_email },
    })

    return NextResponse.json({ ok: true, sent: true })
  } catch (error) {
    console.error('POST /api/admin/service-orders/thank-you:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send thank you' },
      { status: 500 }
    )
  }
}
