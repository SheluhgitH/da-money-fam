import { SEEDANCE_MODELS } from '@/lib/seedance-models'

export interface CoinPackage {
  id: string
  amount: number
  price: number
  /** Approx Lite ads at 6s base */
  liteAds: number
  /** Approx Fast ads at 6s base */
  fastAds: number
  /** Approx Draft images (4 Coinz) */
  draftImages: number
  label: string
}

/** Post 2× rebase packs — same USD prices, double Coinz */
export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'starter',
    amount: 100,
    price: 8,
    liteAds: 5,
    fastAds: 2,
    draftImages: 25,
    label: 'Starter',
  },
  {
    id: 'creator',
    amount: 300,
    price: 20,
    liteAds: 15,
    fastAds: 7,
    draftImages: 75,
    label: 'Creator',
  },
  {
    id: 'studio',
    amount: 800,
    price: 50,
    liteAds: 40,
    fastAds: 20,
    draftImages: 200,
    label: 'Studio',
  },
]

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id)
}

export function packAdCopy(pkg: CoinPackage): string {
  return `≈ ${pkg.liteAds} Lite · ${pkg.fastAds} Fast · ${pkg.draftImages} Draft imgs`
}

/** Sanity: pack math vs catalog base coins */
export const PACK_REFERENCE = {
  liteBase: SEEDANCE_MODELS.lite.baseCoins,
  fastBase: SEEDANCE_MODELS.fast.baseCoins,
} as const

export const ALLOWED_COIN_RETURN_PATHS = new Set(['/account', '/ad-studio', '/coin-wallet'])

export function sanitizeCoinReturnPath(path: unknown): string {
  if (typeof path !== 'string') return '/account'
  const cleaned = path.split('?')[0]
  return ALLOWED_COIN_RETURN_PATHS.has(cleaned) ? cleaned : '/account'
}
