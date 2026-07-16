import Stripe from 'stripe'
import {
  createMerchOrder,
  createServiceOrder,
  createStripeOrder,
  generateDownloadToken,
  getMerchOrderByStripeSession,
  getOrderByStripeSession,
  getSongById,
} from '@/lib/store'
import { creditUserCoins, awardXp } from '@/lib/user-store'
import { sendMerchAdminNotification, sendMerchOrderConfirmation, sendServiceOrderConfirmation, sendServiceAdminNotification } from '@/lib/email'
import { getBundle } from '@/lib/bundles'
import { recordReferralPurchase, rewardReferrer, completeReferralReward } from '@/lib/referrals-store'
import { upsertFanSubscription, setFanClubCustomerId } from '@/lib/fan-club'
import { getStripe } from '@/lib/stripe'

function formatShippingAddress(session: Stripe.Checkout.Session): string {
  const shipSession = session as Stripe.Checkout.Session & {
    shipping_details?: { address?: Stripe.Address | null; name?: string | null } | null
  }
  const addr = shipSession.shipping_details?.address || session.customer_details?.address
  const name = shipSession.shipping_details?.name || session.customer_details?.name || ''
  if (!addr) return name || 'Address collected in Stripe'

  const lines = [
    name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(', '),
    addr.country,
  ].filter(Boolean)

  return lines.join('\n')
}

async function fulfillSongOrder(
  session: Stripe.Checkout.Session,
  songId: string,
  sessionKey: string,
  userId: string | null,
  referrerId?: string | null
) {
  const existing = await getOrderByStripeSession(sessionKey)
  if (existing?.download_token) {
    return existing
  }

  const song = await getSongById(songId)
  if (!song || song.for_sale === false) {
    throw new Error(`Song not available: ${songId}`)
  }

  const downloadToken = generateDownloadToken()
  const buyerEmail =
    session.customer_details?.email || session.customer_email || 'customer@stripe.com'
  const buyerName = session.customer_details?.name || 'Stripe Customer'

  const order = await createStripeOrder({
    song_id: songId,
    song_title: song.title,
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    stripe_session_id: sessionKey,
    download_token: downloadToken,
    user_id: userId,
  })

  if (userId) await awardXp(userId, 1000)

  if (referrerId) {
    const referral = await recordReferralPurchase({
      referrer_id: referrerId,
      referred_user_id: userId,
      buyer_email: buyerEmail,
      order_id: order.id,
    })
    if (referral) {
      const couponId = await rewardReferrer(referrerId)
      if (couponId) await completeReferralReward(referral.id, couponId)
    }
  }

  return order
}

export async function fulfillStripeSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' && session.mode === 'payment') {
    throw new Error('Payment not completed')
  }

  const meta = session.metadata || {}
  const { type, song_id, coin_amount, user_id, merch_id, merch_name, price, size, bundle_id, song_ids, package_slug, referrer_id } = meta

  if (type === 'coin_purchase') {
    if (!user_id || !coin_amount) throw new Error('Missing metadata for coin purchase')
    await creditUserCoins(user_id, parseInt(coin_amount, 10))
    return { success: true, type: 'coin_purchase' as const }
  }

  if (type === 'fan_club_subscription') {
    if (!user_id || !session.subscription) throw new Error('Missing fan club metadata')
    const stripe = getStripe()
    const subRaw = await stripe.subscriptions.retrieve(String(session.subscription))
    const sub = subRaw as unknown as Stripe.Subscription
    if (session.customer) {
      await setFanClubCustomerId(user_id, String(session.customer))
    }
    const periodEnd = (sub as { current_period_end?: number }).current_period_end
    await upsertFanSubscription({
      user_id,
      stripe_subscription_id: sub.id,
      stripe_customer_id: session.customer ? String(session.customer) : null,
      status: sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'canceled',
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    return { success: true, type: 'fan_club_subscription' as const }
  }

  if (type === 'service_deposit') {
    if (!package_slug) throw new Error('Missing service package metadata')
    const buyerEmail =
      session.customer_details?.email || session.customer_email || 'customer@stripe.com'
    const buyerName = session.customer_details?.name || 'Stripe Customer'
    const order = await createServiceOrder({
      package_slug,
      package_name: meta.package_name || package_slug,
      deposit_amount: price ? parseFloat(price) : 0,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      stripe_session_id: session.id,
      user_id: user_id ?? null,
    })
    await sendServiceOrderConfirmation({
      buyerEmail,
      buyerName,
      packageName: order.package_name,
      depositAmount: order.deposit_amount,
    })
    await sendServiceAdminNotification({
      packageName: order.package_name,
      buyerEmail,
      buyerName,
      depositAmount: order.deposit_amount,
    })
    return { success: true, type: 'service_deposit' as const, order_id: order.id }
  }

  if (type === 'merch_purchase') {
    if (!merch_id || !merch_name) throw new Error('Missing metadata for merch purchase')

    const existing = await getMerchOrderByStripeSession(session.id)
    if (existing) {
      return { success: true, type: 'merch_purchase' as const, order_id: existing.id }
    }

    const buyerEmail =
      session.customer_details?.email || session.customer_email || 'customer@stripe.com'
    const buyerName = session.customer_details?.name || 'Stripe Customer'
    const shippingAddress = formatShippingAddress(session)

    const order = await createMerchOrder({
      merch_id,
      merch_name,
      price: price ? parseFloat(price) : 0,
      size: size || null,
      shipping_address: shippingAddress,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      stripe_session_id: session.id,
      user_id: user_id ?? null,
    })

    await sendMerchOrderConfirmation({
      buyerEmail,
      buyerName,
      merchName: merch_name,
      price: order.price,
      size: size || 'N/A',
      shippingAddress,
    })
    await sendMerchAdminNotification({
      merchName: merch_name,
      buyerEmail,
      buyerName,
      size: size || 'N/A',
      price: order.price,
      shippingAddress,
    })

    return { success: true, type: 'merch_purchase' as const, order_id: order.id }
  }

  if (type === 'bundle_purchase') {
    const bundle = bundle_id ? getBundle(bundle_id) : null
    const ids = song_ids ? song_ids.split(',').filter(Boolean) : bundle?.song_ids || []
    if (ids.length === 0) throw new Error('Missing bundle song ids')

    const orders = []
    for (const id of ids) {
      const order = await fulfillSongOrder(
        session,
        id,
        `${session.id}:${id}`,
        user_id ?? null,
        referrer_id
      )
      orders.push(order)
    }

    return {
      success: true,
      type: 'bundle_purchase' as const,
      order_ids: orders.map((o) => o.id),
      song_title: bundle?.name || 'Bundle',
      download_token: orders[0]?.download_token,
    }
  }

  if (!song_id && type !== 'bundle_purchase') {
    throw new Error('Missing song metadata')
  }

  if (type === 'song_purchase' || song_id) {
    const order = await fulfillSongOrder(
      session,
      song_id!,
      session.id,
      user_id ?? null,
      referrer_id
    )

    return {
      download_token: order.download_token!,
      song_title: order.song_title,
      order_id: order.id,
      type: 'song_purchase' as const,
    }
  }

  throw new Error('Unknown checkout session type')
}

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id
  if (!userId) return
  const periodEnd = (subscription as { current_period_end?: number }).current_period_end
  await upsertFanSubscription({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer ? String(subscription.customer) : null,
    status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'canceled',
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  })
}
