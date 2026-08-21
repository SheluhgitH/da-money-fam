import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getCoinzLedger } from '@/lib/user-store'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200)
  const entries = await getCoinzLedger(params.id, limit)
  return NextResponse.json({ entries })
}
