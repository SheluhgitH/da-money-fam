import { allArtists } from '@/data/artists'
import type { PublicSong } from '@/types/store'

export type CatalogArtist = {
  key: string
  name: string
  role?: string
  photo: string
  songs: PublicSong[]
}

/** URL slug from artist name: "Vlone Tr3" → "vlone-tr3" */
export function slugifyArtistName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function artistSharePath(name: string): string {
  return `/artist/${slugifyArtistName(name)}`
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
  for (const [key, list] of Array.from(groups.entries())) {
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

export function resolveArtistBySlug(
  slug: string,
  songs: PublicSong[]
): CatalogArtist | null {
  const normalized = slugifyArtistName(decodeURIComponent(slug))
  if (!normalized) return null
  const artists = groupCatalogArtists(songs)
  return artists.find((a) => slugifyArtistName(a.name) === normalized) || null
}
