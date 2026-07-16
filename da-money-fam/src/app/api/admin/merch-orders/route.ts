import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getAllMerchOrders } from '@/lib/store'

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orders = await getAllMerchOrders()
  return NextResponse.json({ orders })
}
