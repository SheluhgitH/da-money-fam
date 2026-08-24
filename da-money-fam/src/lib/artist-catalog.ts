import { allArtists } from '@/data/artists'
import type { PublicSong } from '@/types/store'

export type CatalogArtist = {
  key: string
  name: string
  role?: string
  photo: string
  songs: PublicSong[]
}

export function groupCatalogArtists(songs: PublicSong[]): CatalogArtist[] {
  const groups = new Map<string, PublicSong[]>()
  for (const song of songs) {
    const name = song.artist.trim()
    if (!name) continue
    const key = name.toLowerCase()
    const list = groups.get(key)
    if (list) list.push(song)
    else groups.set(key, [song])
  }

  const rosterByName = new Map(
    allArtists.map((artist) => [artist.name.trim().toLowerCase(), artist])
  )

  const result: CatalogArtist[] = []
  for (const [key, list] of groups) {
    const roster = rosterByName.get(key)
    const featured = list.find((s) => s.is_promoted) || list[0]
    const sorted = [...list].sort((a, b) => Number(b.is_promoted) - Number(a.is_promoted))
    result.push({
      key,
      name: roster?.name || list[0].artist.trim(),
      role: roster?.role,
      photo: roster?.mainImage || featured.album_cover_path,
      songs: sorted,
    })
  }

  return result.sort(
    (a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name)
  )
}
