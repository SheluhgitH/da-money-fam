export type VaultDropType = 'wallpaper' | 'photo' | 'link'

export type VaultDrop = {
  id: string
  title: string
  type: VaultDropType
  description: string
  /** Image shown in the card */
  thumb: string
  /** Download or destination URL when unlocked */
  href: string
  cta: string
}

export const VAULT_DROPS: VaultDrop[] = [
  {
    id: 'fam-wallpaper-pack',
    title: 'Fam Wallpaper Pack',
    type: 'wallpaper',
    description: 'Three exclusive BTS stills sized for your lock screen.',
    thumb: '/images/collective/collective-3.jpg',
    href: '/wallpapers?pack=vault',
    cta: 'Download Pack',
  },
  {
    id: 'bts-mic-check',
    title: 'Mic Check Still',
    type: 'photo',
    description: 'Unreleased frame from a DMF session — members only.',
    thumb: '/images/collective/collective-10.jpg',
    href: '/images/collective/collective-10.jpg',
    cta: 'Open Photo',
  },
  {
    id: 'stream-archive',
    title: 'Stream Archive',
    type: 'link',
    description: 'Jump straight to the latest Kick VODs and live sessions.',
    thumb: '/images/collective/collective-8.jpg',
    href: '/#streams',
    cta: 'Watch Streams',
  },
]
