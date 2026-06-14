import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserLibrary } from '@/lib/user-store'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const library = await getUserLibrary(user.id)
    return NextResponse.json({ library })
  } catch (error) {
    console.error('GET /api/library error:', error)
    return NextResponse.json({ error: 'Failed to load library' }, { status: 500 })
  }
}
