export type MerchSize = 'S' | 'M' | 'L' | 'XL'

export const MERCH_SIZES: MerchSize[] = ['S', 'M', 'L', 'XL']

export type MerchItem = {
  id: string
  name: string
  category: string
  price: number
  sizes: MerchSize[]
}

export const MERCH_CATALOG: Record<string, MerchItem> = {
  '1': { id: '1', name: 'Custom 1of1 DMF T-Shirt', category: 'T-SHIRT', price: 75, sizes: MERCH_SIZES },
  '2': { id: '2', name: 'DMF 1of1 Sweater — Style 1', category: 'SWEATER', price: 120, sizes: MERCH_SIZES },
  '3': { id: '3', name: 'DMF 1of1 Sweater — Style 2', category: 'SWEATER', price: 120, sizes: MERCH_SIZES },
}

export function isValidMerchSize(size: string, item: MerchItem): size is MerchSize {
  return item.sizes.includes(size as MerchSize)
}

export function getMerchItem(merchId: string): MerchItem | null {
  return MERCH_CATALOG[merchId] ?? null
}
