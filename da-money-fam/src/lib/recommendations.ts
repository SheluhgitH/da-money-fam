import type { PublicSong } from '@/types/store'

export function getRecommendations(
  songs: PublicSong[],
  favoriteIds: string[],
  ownedIds: string[]
): PublicSong[] {
  const exclude = new Set([...favoriteIds, ...ownedIds])
  const favoritedGenres = new Set(
    songs.filter((s) => favoriteIds.includes(s.id) && s.genre).map((s) => s.genre!)
  )

  const scored = songs
    .filter((s) => !exclude.has(s.id))
    .map((song) => {
      let score = 0
      if (song.is_promoted) score += 3
      if (song.genre && favoritedGenres.has(song.genre)) score += 2
      return { song, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 3).map(({ song }) => song)
}
