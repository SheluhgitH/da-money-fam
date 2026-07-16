import { NextResponse } from 'next/server'
import { getPublishedSongs, toPublicSong } from '@/lib/store'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserFavorites, getUserOwnedSongIds, getSongCommentCounts, getSongFavoriteCounts } from '@/lib/user-store'
import { getRecommendations } from '@/lib/recommendations'

export const dynamic = 'force-dynamic'

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

    const commentCounts = await getSongCommentCounts(publicSongs.map((s) => s.id))
    const favoriteCounts = await getSongFavoriteCounts(publicSongs.map((s) => s.id))
    const songsWithCounts = publicSongs.map((song) => ({
      ...song,
      comment_count: commentCounts[song.id] || 0,
      favorite_count: favoriteCounts[song.id] || 0,
    }))

    const recommendations =
      user && songsWithCounts.length > 0
        ? getRecommendations(songsWithCounts, favoriteIds, ownedIds)
        : []

    return NextResponse.json({ songs: songsWithCounts, recommendations })
  } catch (error) {
    console.error('GET /api/songs error:', error)
    return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 })
  }
}
