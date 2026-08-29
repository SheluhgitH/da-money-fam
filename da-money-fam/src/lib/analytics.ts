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
    va?: (event: string, data?: Record<string, unknown>) => void
  }
}

function emit(event: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, params || {})
  }
  try {
    window.va?.('event', { name: event, ...(params || {}) })
  } catch {
    /* ignore */
  }
}

export function trackEvent(event: string, params?: Record<string, unknown>): void {
  emit(event, params)
}

export function trackPurchase(event: PurchaseEvent): void {
  emit('purchase', {
    transaction_id: event.transaction_id,
    value: event.value,
    currency: event.currency || 'USD',
    items: event.items,
  })
}

export function trackPreviewEnded(songId?: string): void {
  emit('preview_ended', songId ? { song_id: songId } : undefined)
}

export function trackFanClubCta(source: string): void {
  emit('fan_club_cta_click', { source })
}

export function trackCoinzCheckout(packageId: string, source: string): void {
  emit('coinz_checkout_start', { package_id: packageId, source })
}

export function trackAdStudioGenerate(mode: string, model?: string): void {
  emit('ad_studio_generate', { mode, model })
}

export function trackStoryboardSceneComplete(sceneIndex: number): void {
  emit('storyboard_scene_complete', { scene_index: sceneIndex })
}
