import { NextResponse } from 'next/server'
import { getPublishedSongs, toPublicSong } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserFavorites, getUserOwnedSongIds } from '@/lib/user-store'
import { getRecommendations } from '@/lib/recommendations'

export async function GET() {
  try {
    const songs = await getPublishedSongs()
    const user = await getCurrentUser()

    let favoriteIds: string[] = []
    let ownedIds: string[] = []

    if (user) {
      favoriteIds = await getUserFavorites(user.id)
      ownedIds = await getUserOwnedSongIds(user.id)
    }

    const publicSongs = songs.map((song) =>
      toPublicSong(song, {
        owned: user ? ownedIds.includes(song.id) : undefined,
        is_favorited: user ? favoriteIds.includes(song.id) : undefined,
      })
    )

    const recommendations =
      user && publicSongs.length > 0
        ? getRecommendations(publicSongs, favoriteIds, ownedIds)
        : []

    return NextResponse.json({ songs: publicSongs, recommendations })
  } catch (error) {
    console.error('GET /api/songs error:', error)
    return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 })
  }
}
