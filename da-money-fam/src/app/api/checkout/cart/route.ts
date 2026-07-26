import { NextResponse } from 'next/server'
import { getSongById } from '@/lib/store'
import { getMerchItem, isValidMerchSize, canPurchaseMerch } from '@/lib/merch'
import { getStripe, getSiteUrl } from '@/lib/stripe'
import { stripeHomeReturnUrl } from '@/lib/stripe-redirects'
import { checkRateLimit } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserStats } from '@/lib/user-store'
import { getReferralCookie } from '@/lib/referrals'
import { isActiveFanClubMember } from '@/lib/fan-club'
import {
  LEVEL3_DISCOUNT_PERCENT,
  canAccessPerk,
  canPurchaseSong,
  levelFromXp,
} from '@/lib/fan-perks'
import type Stripe from 'stripe'

type CartItemInput = {
  kind: 'song' | 'merch'
  songId?: string
  merchId?: number
  size?: string
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout-cart:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const items = (Array.isArray(body.items) ? body.items : []) as CartItemInput[]

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    if (items.length > 20) {
      return NextResponse.json({ error: 'Too many items in cart' }, { status: 400 })
    }

    const user = await getCurrentUser()
    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const referral = await getReferralCookie()

    const stats = user ? await getUserStats(user.id) : null
    const fanClub = user ? await isActiveFanClubMember(user.id) : false
    const level = stats ? levelFromXp(stats.xp) : 1
    const levelDiscount = canAccessPerk(level, fanClub, 'song_discount')
    const now = new Date()

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const songIds: string[] = []
    const merchItems: Array<{ id: string; size: string; name: string; price: number }> = []

    for (const item of items) {
      if (item.kind === 'song') {
        if (!item.songId) {
          return NextResponse.json({ error: 'songId is required for song items' }, { status: 400 })
        }
        if (songIds.includes(item.songId)) continue

        const song = await getSongById(item.songId)
        if (!song || !song.is_published) {
          return NextResponse.json({ error: `Song not found: ${item.songId}` }, { status: 404 })
        }
        if (!canPurchaseSong(song, now, level, fanClub)) {
          return NextResponse.json(
            { error: `"${song.title}" is not available for purchase yet` },
            { status: 403 }
          )
        }

        let unitAmount = Math.round(song.price * 100)
        let discountNote = ''
        if (levelDiscount) {
          unitAmount = Math.round(unitAmount * (1 - LEVEL3_DISCOUNT_PERCENT / 100))
          discountNote = ` — ${LEVEL3_DISCOUNT_PERCENT}% fan discount`
        }

        songIds.push(song.id)
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${song.title} — ${song.artist}${discountNote}`,
              description: `Digital download: ${song.title}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        })
        continue
      }

      if (item.kind === 'merch') {
        if (item.merchId == null) {
          return NextResponse.json({ error: 'merchId is required for merch items' }, { status: 400 })
        }
        if (!item.size || typeof item.size !== 'string') {
          return NextResponse.json({ error: 'size is required for merch items' }, { status: 400 })
        }

        const merch = getMerchItem(String(item.merchId))
        if (!merch) {
          return NextResponse.json({ error: `Merch item not found: ${item.merchId}` }, { status: 404 })
        }
        if (!isValidMerchSize(item.size, merch)) {
          return NextResponse.json({ error: `Invalid size for ${merch.name}` }, { status: 400 })
        }
        if (!canPurchaseMerch(merch, now, level, fanClub)) {
          return NextResponse.json(
            { error: `"${merch.name}" is in Fan Club / Level 5 presale` },
            { status: 403 }
          )
        }

        const key = `${merch.id}:${item.size}`
        if (merchItems.some((m) => `${m.id}:${m.size}` === key)) continue

        merchItems.push({
          id: merch.id,
          size: item.size,
          name: merch.name,
          price: merch.price,
        })
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${merch.name} — Size ${item.size}`,
              description: `DMF 1-of-1 merchandise — ${merch.category}`,
            },
            unit_amount: Math.round(merch.price * 100),
          },
          quantity: 1,
        })
        continue
      }

      return NextResponse.json({ error: 'Invalid cart item kind' }, { status: 400 })
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: 'No valid items to checkout' }, { status: 400 })
    }

    const hasMerch = merchItems.length > 0
    const hasSongs = songIds.length > 0

    const metadata: Record<string, string> = {
      type: 'cart_purchase',
      song_ids: songIds.join(','),
      merch_items: JSON.stringify(
        merchItems.map((m) => ({ id: m.id, size: m.size, name: m.name, price: m.price }))
      ),
    }
    if (user) metadata.user_id = user.id
    if (referral) metadata.referrer_id = referral

    const successUrl =
      hasSongs || !hasMerch
        ? `${siteUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`
        : stripeHomeReturnUrl(siteUrl, {
            section: 'merch',
            checkout: 'success',
            includeSessionId: true,
          })

    const cancelSection = hasMerch && !hasSongs ? 'merch' : 'store'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      ...(hasMerch
        ? {
            shipping_address_collection: {
              allowed_countries: ['US', 'CA', 'GB', 'AU'],
            },
          }
        : {}),
      line_items: lineItems,
      metadata,
      success_url: successUrl,
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: cancelSection, checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Cart checkout create error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = message.includes('Payments are temporarily unavailable') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
