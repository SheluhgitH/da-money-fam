import { NextResponse } from 'next/server'
import { listFeaturedGenerations } from '@/lib/ad-studio-jobs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await listFeaturedGenerations(12)
    const items = rows.map((row) => ({
      id: row.id,
      videoUrl: `/api/video/showcase/${row.id}/content`,
      aspect_ratio: row.aspect_ratio || '9:16',
      created_at: row.created_at,
    }))
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Showcase GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
