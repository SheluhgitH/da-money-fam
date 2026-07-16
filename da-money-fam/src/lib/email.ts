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
