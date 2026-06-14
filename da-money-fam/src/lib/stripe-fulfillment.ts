import Stripe from 'stripe'
import { createStripeOrder, generateDownloadToken, getOrderByStripeSession } from '@/lib/store'
import { creditUserCoins } from '@/lib/user-store'

export async function fulfillStripeSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const { type, song_id, coin_amount, user_id } = session.metadata || {}

  if (type === 'coin_purchase') {
    if (!user_id || !coin_amount) {
      throw new Error('Missing metadata for coin purchase')
    }
    await creditUserCoins(user_id, parseInt(coin_amount, 10))
    return { success: true, type: 'coin_purchase' }
  }

  // Existing song purchase logic
  const { type, song_id, coin_amount, user_id } = session.metadata || {}

  if (type === 'coin_purchase') {
    if (!user_id || !coin_amount) {
      throw new Error('Missing metadata for coin purchase')
    }
    await creditUserCoins(user_id, parseInt(coin_amount, 10))
    return { success: true, type: 'coin_purchase' }
  }

  // Existing song purchase logic
  if (!song_id) {
    throw new Error('Missing song metadata')
  }

  const existing = await getOrderByStripeSession(session.id)
  if (existing?.download_token) {
    return {
      download_token: existing.download_token,
      song_title: existing.song_title,
      order_id: existing.id,
      type: 'song_purchase',
    }
  }

  const song = await getSongById(song_id)
  if (!song) {
    throw new Error('Song not found')
  }

  const downloadToken = generateDownloadToken()
  const buyerEmail =
    session.customer_details?.email || session.customer_email || 'customer@stripe.com'
  const buyerName = session.customer_details?.name || 'Stripe Customer'

  const order = await createStripeOrder({
    song_id: song_id,
    song_title: song.title,
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    stripe_session_id: session.id,
    download_token: downloadToken,
    user_id: user_id ?? null,
  })

  return {
    download_token: order.download_token!,
    song_title: order.song_title,
    order_id: order.id,
    type: 'song_purchase',
  }
}
