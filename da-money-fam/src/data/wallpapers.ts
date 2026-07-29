export type WallpaperAsset = {
  id: string
  title: string
  src: string
  orientation: 'portrait' | 'landscape' | 'square'
}

/** Free pack delivered after newsletter signup */
export const NEWSLETTER_WALLPAPERS: WallpaperAsset[] = [
  {
    id: 'dmf-collective-1',
    title: 'Fam Energy',
    src: '/images/collective/collective-2.jpg',
    orientation: 'portrait',
  },
  {
    id: 'dmf-collective-2',
    title: 'Night Session',
    src: '/images/collective/collective-5.jpg',
    orientation: 'portrait',
  },
  {
    id: 'dmf-collective-3',
    title: 'Stage Lights',
    src: '/images/collective/collective-8.jpg',
    orientation: 'portrait',
  },
]

/** Extra stills unlocked in The Vault (Fan Club / L5) */
export const VAULT_WALLPAPERS: WallpaperAsset[] = [
  {
    id: 'vault-bts-1',
    title: 'BTS — Cookout Frame',
    src: '/images/collective/collective-3.jpg',
    orientation: 'portrait',
  },
  {
    id: 'vault-bts-2',
    title: 'BTS — Mic Check',
    src: '/images/collective/collective-10.jpg',
    orientation: 'portrait',
  },
  {
    id: 'vault-bts-3',
    title: 'BTS — Fam Circle',
    src: '/images/collective/collective-12.jpg',
    orientation: 'portrait',
  },
]
