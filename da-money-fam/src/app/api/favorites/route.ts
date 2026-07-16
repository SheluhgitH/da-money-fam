import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { addFavorite, removeFavorite, getUserFavorites, awardXp } from '@/lib/user-store'
import { getSongById } from '@/lib/store'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const favorites = await getUserFavorites(user.id)
  return NextResponse.json({ favorites })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { song_id } = await req.json()
    if (!song_id) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    await addFavorite(user.id, song_id)
    await awardXp(user.id, 100)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add favorite' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('song_id')
    if (!songId) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    await removeFavorite(user.id, songId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove favorite' },
      { status: 400 }
    )
  }
}
