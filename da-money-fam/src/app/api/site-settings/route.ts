import { NextResponse } from 'next/server'
import { loadSiteSettingsMap } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  const settings = await loadSiteSettingsMap()
  return NextResponse.json(
    { settings },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
  )
}
