import { NextResponse } from 'next/server'
import { getPaymentSettings } from '@/lib/store'

export async function GET() {
  try {
    const settings = await getPaymentSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('GET /api/payment-settings error:', error)
    return NextResponse.json({ error: 'Failed to load payment settings' }, { status: 500 })
  }
}
