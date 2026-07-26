import type Stripe from 'stripe'

export function getStripePurchaseAnalytics(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  const itemName =
    metadata.package_name ||
    metadata.merch_name ||
    metadata.song_title ||
    metadata.bundle_name ||
    'DMF purchase'

  const itemCategory =
    metadata.type === 'bundle_purchase'
      ? 'bundle'
      : metadata.type === 'merch_purchase'
        ? 'merch'
        : metadata.type === 'service_deposit'
          ? 'service'
          : metadata.type === 'song_purchase'
            ? 'song'
            : 'purchase'

  return {
    transaction_id: session.id,
    value: (session.amount_total ?? 0) / 100,
    currency: (session.currency ?? 'usd').toUpperCase(),
    items: [
      {
        item_id:
          metadata.song_id ||
          metadata.merch_id ||
          metadata.package_slug ||
          metadata.bundle_id ||
          session.id,
        item_name: itemName,
        item_category: itemCategory,
        price: (session.amount_total ?? 0) / 100,
        quantity: 1,
      },
    ],
  }
}
