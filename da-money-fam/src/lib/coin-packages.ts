import { SEEDANCE_MODELS } from '@/lib/seedance-models'

export interface CoinPackage {
  id: string
  amount: number
  price: number
  /** Approx Lite ads at 6s base (5 Coinz) */
  liteAds: number
  /** Approx Fast ads at 6s base (10 Coinz) */
  fastAds: number
  label: string
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'starter',
    amount: 50,
    price: 5,
    liteAds: 10,
    fastAds: 5,
    label: 'Starter',
  },
  {
    id: 'creator',
    amount: 150,
    price: 12,
    liteAds: 30,
    fastAds: 15,
    label: 'Creator',
  },
  {
    id: 'studio',
    amount: 400,
    price: 28,
    liteAds: 80,
    fastAds: 40,
    label: 'Studio',
  },
]

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id)
}

export function packAdCopy(pkg: CoinPackage): string {
  return `≈ ${pkg.liteAds} Lite · ${pkg.fastAds} Fast (6s)`
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
