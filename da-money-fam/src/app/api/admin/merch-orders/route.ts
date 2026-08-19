import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getAllMerchOrders, updateMerchOrder } from '@/lib/store'
import type { MerchOrderStatus } from '@/types/store'
import { writeAdminAudit } from '@/lib/site-settings'
import { sendMerchStatusEmail } from '@/lib/email'

const STATUSES: MerchOrderStatus[] = ['paid', 'packing', 'shipped', 'fulfilled', 'rejected']

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await getAllMerchOrders()
  return NextResponse.json({ orders })
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: { status?: MerchOrderStatus; admin_notes?: string } = {}
    if (typeof body.status === 'string') {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }
    if (typeof body.admin_notes === 'string') updates.admin_notes = body.admin_notes

    const order = await updateMerchOrder(id, updates)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    await writeAdminAudit({
      action: 'patch',
      entity: 'merch_order',
      entityId: id,
      payload: updates,
    })

    if (body.send_email && updates.status) {
      await sendMerchStatusEmail(order)
    }

    return NextResponse.json({ order })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update merch order' },
      { status: 400 }
    )
  }
}
