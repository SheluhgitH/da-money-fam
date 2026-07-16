export type SongBundle = {
  id: string
  name: string
  description: string
  song_ids: string[]
  price: number
}

export const SONG_BUNDLES: Record<string, SongBundle> = {
  'starter-pack': {
    id: 'starter-pack',
    name: 'Starter Pack',
    description: 'Lotto Devil Inside Me + Rockstar Baby — 2 tracks for $8',
    song_ids: ['lotto-devil-inside-me', 'rockstar-baby'],
    price: 8,
  },
}

export function getBundle(bundleId: string): SongBundle | null {
  return SONG_BUNDLES[bundleId] ?? null
}
