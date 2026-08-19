import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import {
  loadSiteSettingsMap,
  upsertSiteSettings,
  writeAdminAudit,
} from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const settings = await loadSiteSettingsMap(true)
  return NextResponse.json({ settings })
}

export async function PUT(req: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const settings = body.settings
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'settings object required' }, { status: 400 })
  }

  await upsertSiteSettings(settings as Record<string, unknown>)
  await writeAdminAudit({
    action: 'update',
    entity: 'site_settings',
    payload: Object.keys(settings as object),
  })

  const next = await loadSiteSettingsMap(true)
  return NextResponse.json({ settings: next })
}
