import { SEEDANCE_MODELS } from '@/lib/seedance-models'
import { IMAGE_MODELS } from '@/lib/image-models'

export interface CoinPackage {
  id: string
  amount: number
  price: number
  liteAds: number
  miniAds: number
  fastAds: number
  draftImages: number
  label: string
}

function packMeta(amount: number) {
  return {
    liteAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.lite.baseCoins)),
    miniAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.mini.baseCoins)),
    fastAds: Math.max(1, Math.floor(amount / SEEDANCE_MODELS.fast.baseCoins)),
    draftImages: Math.max(1, Math.floor(amount / IMAGE_MODELS.draft.baseCoins)),
  }
}

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: 'starter',
    amount: 150,
    price: 8,
    ...packMeta(150),
    label: 'Starter',
  },
  {
    id: 'creator',
    amount: 450,
    price: 20,
    ...packMeta(450),
    label: 'Creator',
  },
  {
    id: 'studio',
    amount: 1200,
    price: 50,
    ...packMeta(1200),
    label: 'Studio',
  },
]

export function getCoinPackage(id: string): CoinPackage | undefined {
  return COIN_PACKAGES.find((p) => p.id === id)
}

export function packAdCopy(pkg: CoinPackage): string {
  return `≈ ${pkg.liteAds} Lite · ${pkg.miniAds} Mini · ${pkg.fastAds} Fast · ${pkg.draftImages} Draft imgs`
}

export const PACK_REFERENCE = {
  liteBase: SEEDANCE_MODELS.lite.baseCoins,
  miniBase: SEEDANCE_MODELS.mini.baseCoins,
  fastBase: SEEDANCE_MODELS.fast.baseCoins,
} as const

export const ALLOWED_COIN_RETURN_PATHS = new Set(['/account', '/ad-studio', '/coin-wallet'])

export function sanitizeCoinReturnPath(path: unknown): string {
  if (typeof path === 'string') {
    const cleaned = path.split('?')[0]
    return ALLOWED_COIN_RETURN_PATHS.has(cleaned) ? cleaned : '/account'
  }
  return '/account'
}
