type PurchaseItem = {
  item_id?: string
  item_name: string
  item_category?: string
  price?: number
  quantity?: number
}

type PurchaseEvent = {
  transaction_id: string
  value: number
  currency?: string
  items?: PurchaseItem[]
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackPurchase(event: PurchaseEvent): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return

  window.gtag('event', 'purchase', {
    transaction_id: event.transaction_id,
    value: event.value,
    currency: event.currency || 'USD',
    items: event.items,
  })
}
