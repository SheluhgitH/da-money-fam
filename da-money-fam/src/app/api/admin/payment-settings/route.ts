import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getPaymentSettings, updatePaymentSettings } from '@/lib/store'
import { paymentSettingsSchema } from '@/lib/validation'

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getPaymentSettings()
  return NextResponse.json({ settings })
}

export async function PUT(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    await paymentSettingsSchema.validate(body)
    const settings = await updatePaymentSettings(body)
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid settings' },
      { status: 400 }
    )
  }
}
