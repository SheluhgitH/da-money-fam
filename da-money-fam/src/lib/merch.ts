export type MerchSize = 'S' | 'M' | 'L' | 'XL'

export const MERCH_SIZES: MerchSize[] = ['S', 'M', 'L', 'XL']

export type MerchItem = {
  id: string
  name: string
  category: string
  price: number
  sizes: MerchSize[]
  /** ISO date YYYY-MM-DD — before this date only L5 / Fan Club can buy */
  presale_until?: string
}

export const MERCH_CATALOG: Record<string, MerchItem> = {
  '1': {
    id: '1',
    name: 'Custom 1of1 DMF T-Shirt',
    category: 'T-SHIRT',
    price: 75,
    sizes: MERCH_SIZES,
  },
  '2': {
    id: '2',
    name: 'DMF 1of1 Sweater — Style 1',
    category: 'SWEATER',
    price: 120,
    sizes: MERCH_SIZES,
    presale_until: '2026-08-15',
  },
  '3': {
    id: '3',
    name: 'DMF 1of1 Sweater — Style 2',
    category: 'SWEATER',
    price: 120,
    sizes: MERCH_SIZES,
  },
}

export function isValidMerchSize(size: string, item: MerchItem): size is MerchSize {
  return item.sizes.includes(size as MerchSize)
}

export function getMerchItem(merchId: string): MerchItem | null {
  return MERCH_CATALOG[merchId] ?? null
}

export function isMerchInPresale(item: MerchItem, now = new Date()): boolean {
  if (!item.presale_until) return false
  const until = new Date(item.presale_until + 'T23:59:59')
  return now < until
}

export function canPurchaseMerch(
  item: MerchItem,
  now: Date,
  level: number,
  fanClub: boolean
): boolean {
  if (!isMerchInPresale(item, now)) return true
  return fanClub || level >= 5
}
