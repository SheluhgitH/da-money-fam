import { NextResponse } from 'next/server'
import { getSongById } from '@/lib/store'
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

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous'
  const rate = checkRateLimit(`checkout:${ip}`, 10, 60_000)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
  }

  try {
    const { song_id } = await req.json()

    if (!song_id) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    const stats = user ? await getUserStats(user.id) : null
    const fanClub = user ? await isActiveFanClubMember(user.id) : false
    const level = stats ? levelFromXp(stats.xp) : 1

    if (!canPurchaseSong(song, new Date(), level, fanClub)) {
      if (song.access === 'exclusive') {
        return NextResponse.json(
          { error: 'Fam Exclusive — unlock with Fan Club or Level 5' },
          { status: 403 }
        )
      }
      if (song.access === 'early') {
        return NextResponse.json(
          { error: 'Early access only — unlock with Fan Club or Level 5' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'This track is not available for purchase yet' },
        { status: 403 }
      )
    }

    const stripe = getStripe()
    const siteUrl = getSiteUrl()
    const referral = await getReferralCookie()

    let unitAmount = Math.round(song.price * 100)
    let discountNote = ''

    if (user && canAccessPerk(level, fanClub, 'song_discount')) {
      unitAmount = Math.round(unitAmount * (1 - LEVEL3_DISCOUNT_PERCENT / 100))
      discountNote = fanClub
        ? ` — ${LEVEL3_DISCOUNT_PERCENT}% Fan Club discount`
        : ` — ${LEVEL3_DISCOUNT_PERCENT}% Level ${level} fan discount`
    }

    const metadata: Record<string, string> = {
      type: 'song_purchase',
      song_id: song.id,
      song_title: song.title,
    }
    if (user) {
      metadata.user_id = user.id
    }
    if (referral) {
      metadata.referrer_id = referral
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${song.title} — ${song.artist}${discountNote}`,
              description: `Digital download: ${song.title}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${siteUrl}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeHomeReturnUrl(siteUrl, { section: 'store', checkout: 'cancel' }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout create error:', error)
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const status = message.includes('Payments are temporarily unavailable') ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
