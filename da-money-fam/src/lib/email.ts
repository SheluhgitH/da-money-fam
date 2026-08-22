import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key || key === 'your_api_key_here') return null
  return new Resend(key)
}

const FROM = 'DMF Store <onboarding@resend.dev>'

export async function sendMerchOrderConfirmation(input: {
  buyerEmail: string
  buyerName: string
  merchName: string
  price: number
  size: string
  shippingAddress: string
}) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM,
    to: input.buyerEmail,
    subject: `DMF Merch Order Confirmed: ${input.merchName}`,
    html: `
      <h2>Your merch order is confirmed</h2>
      <p>Hi ${input.buyerName},</p>
      <p>Thanks for supporting Da Money Fam. We received your payment for <strong>${input.merchName}</strong> (${input.size}).</p>
      <p><strong>Ship to:</strong><br/>${input.shippingAddress.replace(/\n/g, '<br/>')}</p>
      <p>Total: $${input.price.toFixed(2)}</p>
      <p>We'll ship your 1-of-1 piece soon. You'll get tracking info when it goes out.</p>
    `,
  })
}

export async function sendMerchAdminNotification(input: {
  merchName: string
  buyerEmail: string
  buyerName: string
  size: string
  price: number
  shippingAddress: string
}) {
  const resend = getResend()
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.RESEND_ADMIN_EMAIL
  if (!resend || !adminEmail) return

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New merch order: ${input.merchName}`,
    html: `
      <h2>New merch order</h2>
      <p><strong>Item:</strong> ${input.merchName} (${input.size})</p>
      <p><strong>Buyer:</strong> ${input.buyerName} · ${input.buyerEmail}</p>
      <p><strong>Total:</strong> $${input.price.toFixed(2)}</p>
      <p><strong>Ship to:</strong><br/>${input.shippingAddress.replace(/\n/g, '<br/>')}</p>
    `,
  })
}

export async function sendServiceOrderConfirmation(input: {
  buyerEmail: string
  buyerName: string
  packageName: string
  depositAmount: number
}) {
  const resend = getResend()
  if (!resend) return

  await resend.emails.send({
    from: FROM,
    to: input.buyerEmail,
    subject: `DMF Services deposit confirmed: ${input.packageName}`,
    html: `
      <h2>Deposit received</h2>
      <p>Hi ${input.buyerName},</p>
      <p>We received your <strong>$${input.depositAmount.toFixed(2)}</strong> deposit for <strong>${input.packageName}</strong>.</p>
      <p>Our team will reach out within 1–2 business days to kick off your project.</p>
    `,
  })
}

export async function sendServiceAdminNotification(input: {
  packageName: string
  buyerEmail: string
  buyerName: string
  depositAmount: number
}) {
  const resend = getResend()
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.RESEND_ADMIN_EMAIL
  if (!resend || !adminEmail) return

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New service deposit: ${input.packageName}`,
    html: `
      <h2>New service deposit</h2>
      <p><strong>Package:</strong> ${input.packageName}</p>
      <p><strong>Buyer:</strong> ${input.buyerName} · ${input.buyerEmail}</p>
      <p><strong>Deposit:</strong> $${input.depositAmount.toFixed(2)}</p>
    `,
  })
}

export async function sendMerchStatusEmail(order: {
  buyer_email: string
  buyer_name: string
  merch_name: string
  status: string
  size?: string | null
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: order.buyer_email,
    subject: `DMF merch update: ${order.merch_name}`,
    html: `
      <h2>Order update</h2>
      <p>Hi ${order.buyer_name},</p>
      <p>Your order for <strong>${order.merch_name}</strong>${order.size ? ` (${order.size})` : ''} is now <strong>${order.status.replace('_', ' ')}</strong>.</p>
    `,
  })
}

export async function sendServiceStatusEmail(order: {
  buyer_email: string
  buyer_name: string
  package_name: string
  status: string
}) {
  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to: order.buyer_email,
    subject: `DMF services update: ${order.package_name}`,
    html: `
      <h2>Project update</h2>
      <p>Hi ${order.buyer_name},</p>
      <p>Your <strong>${order.package_name}</strong> project is now <strong>${order.status.replace('_', ' ')}</strong>.</p>
    `,
  })
}

export async function sendWallpaperWelcomeEmail(input: {
  email: string
  packUrl: string
  wallpaperUrls: string[]
}) {
  const resend = getResend()
  if (!resend) return { sent: false }

  const links = input.wallpaperUrls
    .map((url, i) => `<li><a href="${url}">Wallpaper ${i + 1}</a></li>`)
    .join('')

  await resend.emails.send({
    from: FROM,
    to: input.email,
    subject: 'Your DMF wallpaper pack is ready',
    html: `
      <h2>Welcome to Da Money Fam</h2>
      <p>Thanks for joining the early access list. Your exclusive wallpaper pack is ready.</p>
      <p><a href="${input.packUrl}" style="display:inline-block;padding:12px 20px;background:#d4af37;color:#000;text-decoration:none;border-radius:999px;font-weight:700;">Download Wallpaper Pack</a></p>
      <p>Or grab individual stills:</p>
      <ul>${links}</ul>
      <p>Stay tuned for drop alerts and stream links.</p>
    `,
  })

  return { sent: true }
}

export async function sendReleaseAlert(input: {
  emails: string[]
  title: string
  artist: string
  description?: string
  songUrl: string
  coverUrl: string
}) {
  const resend = getResend()
  if (!resend || input.emails.length === 0) return { sent: 0 }

  const batch = input.emails.slice(0, 50)
  await resend.emails.send({
    from: FROM,
    to: batch[0],
    bcc: batch.length > 1 ? batch.slice(1) : undefined,
    subject: `New Drop: ${input.title} — ${input.artist}`,
    html: `
      <h2>New music from Da Money Fam</h2>
      <p><strong>${input.title}</strong> by ${input.artist} is available now.</p>
      ${input.description ? `<p>${input.description}</p>` : ''}
      <p><a href="${input.songUrl}">Listen &amp; buy →</a></p>
      <p><img src="${input.coverUrl}" alt="${input.title}" width="300" style="border-radius:12px" /></p>
    `,
  })

  return { sent: batch.length }
}

export type ThankYouOrderType = 'song' | 'merch' | 'service'

export async function sendOrderThankYouEmail(input: {
  type: ThankYouOrderType
  buyerEmail: string
  buyerName: string
  itemName: string
  downloadUrl?: string | null
}): Promise<{ sent: boolean }> {
  const resend = getResend()
  if (!resend) return { sent: false }

  const name = input.buyerName || 'fam'
  const item = input.itemName
  let bodyExtra = ''
  if (input.type === 'song') {
    bodyExtra = `<p>Thank you for supporting the music — <strong>${item}</strong> means a lot to the Fam.</p>`
    if (input.downloadUrl) {
      bodyExtra += `<p><a href="${input.downloadUrl}" style="display:inline-block;padding:12px 20px;background:#d4af37;color:#000;text-decoration:none;border-radius:999px;font-weight:700;">Download your track</a></p>`
    }
  } else if (input.type === 'merch') {
    bodyExtra = `<p>Thank you for rocking DMF — we appreciate your order for <strong>${item}</strong>.</p>`
  } else {
    bodyExtra = `<p>Thank you for trusting Da Money Fam with <strong>${item}</strong>. We're glad to have you in the circle.</p>`
  }

  await resend.emails.send({
    from: FROM,
    to: input.buyerEmail,
    subject: 'Thank you from Da Money Fam',
    html: `
      <div style="font-family:Georgia,serif;background:#0a0a0a;color:#f5f5f5;padding:32px;">
        <p style="color:#d4af37;letter-spacing:0.2em;text-transform:uppercase;font-size:12px;">Da Money Fam</p>
        <h2 style="color:#fff;">Thank you, ${name}</h2>
        ${bodyExtra}
        <p style="color:#999;font-size:14px;">Stay locked in — more drops, streams, and culture coming soon.</p>
        <p style="color:#d4af37;font-size:14px;">— DMF</p>
      </div>
    `,
  })

  return { sent: true }
}
