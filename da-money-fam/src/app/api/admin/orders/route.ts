import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import {
  generateDownloadToken,
  getAllOrders,
  getOrderByToken,
  getSongById,
  updateOrder,
} from '@/lib/store'
import { Resend } from 'resend'

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await getAllOrders()
  return NextResponse.json({ orders })
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, status, admin_notes, send_email } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Order id and status are required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { status, admin_notes }

    if (status === 'verified' || status === 'delivered') {
      const token = generateDownloadToken()
      updates.download_token = token
      updates.status = 'delivered'

      const order = await updateOrder(id, updates)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const song = await getSongById(order.song_id)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
      const downloadUrl = `${baseUrl}/api/download/${token}`

      if (send_email && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_api_key_here') {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'DMF Store <onboarding@resend.dev>',
          to: order.buyer_email,
          subject: `Your DMF download: ${order.song_title}`,
          html: `
            <h2>Your download is ready</h2>
            <p>Hi ${order.buyer_name},</p>
            <p>Thanks for supporting Da Money Fam. Your payment for <strong>${order.song_title}</strong> has been verified.</p>
            <p><a href="${downloadUrl}">Download your track</a></p>
            <p>This link is tied to your purchase. Enjoy the music.</p>
          `,
        })
      }

      return NextResponse.json({ order, download_url: downloadUrl })
    }

    const order = await updateOrder(id, updates)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update order' },
      { status: 400 }
    )
  }
}

export async function POST(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const token = body?.token

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const order = await getOrderByToken(token)
  if (!order) {
    return NextResponse.json({ error: 'Invalid or expired download link' }, { status: 404 })
  }

  const song = await getSongById(order.song_id)
  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 })
  }

  return NextResponse.json({
    order_id: order.id,
    song_title: song.title,
  })
}
