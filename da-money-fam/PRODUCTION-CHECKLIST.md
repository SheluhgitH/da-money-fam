# Production Checklist — damoneyfam.com

Use this after every deploy. **Vercel watches `SheluhgitH/da-money-fam`** — always push to `origin`, not only `live`.

## 1. Push code to the Vercel repo

```powershell
cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2"
git push origin main
git push live main
```

Or run [`git-push.bat`](git-push.bat) from the `da-money-fam` folder.

---

## 2. Vercel project settings

Dashboard: [vercel.com](https://vercel.com) → **da-money-fam** project

> **If deploys fail:** open the latest deployment log. Common fixes are Root Directory = `da-money-fam` and ensuring `npm run build` passes locally.

| Setting | Value |
|---------|-------|
| Git Repository | `SheluhgitH/da-money-fam` |
| Production Branch | `main` |
| Root Directory | `da-money-fam` |
| Framework | Next.js |

### Required environment variables

Set in **Settings → Environment Variables** (Production):

| Variable | Example / notes |
|----------|-----------------|
| `NEXT_PUBLIC_SITE_URL` | `https://damoneyfam.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook for `https://damoneyfam.com/api/webhooks/stripe` |
| `STRIPE_FAN_CLUB_PRICE_ID` | Live recurring `price_...` for DMF Fan Club ($9/mo) |
| `ADMIN_PASSWORD` | Strong password (not default) |
| `ADMIN_SESSION_SECRET` | Random 32+ char string |
| `RESEND_API_KEY` | If using contact/order emails |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA4 ID (`G-XXXXXXXX`) |

After changing env vars: **Deployments → ⋯ → Redeploy**.

### Post-audit env verification

On deploy, the app logs `[DMF env ...]` messages when required variables are missing or unsafe. Confirm in Vercel **Runtime Logs**:

| Check | Expected |
|-------|----------|
| `NEXT_PUBLIC_SITE_URL` | `https://damoneyfam.com` (must start with `https://`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Set whenever `NEXT_PUBLIC_SUPABASE_URL` is set |
| `STRIPE_WEBHOOK_SECRET` | Live webhook secret (not placeholder) |
| `ADMIN_PASSWORD` | Not the default `dmf-admin-2026` |
| `ADMIN_SESSION_SECRET` | Random 32+ character string |
| Root Directory | `da-money-fam` (parent `vercel.json` is ignored when root is set) |

Run `merch_orders` migration from [`supabase/schema.sql`](supabase/schema.sql) after deploy if merch checkout was just added.

### Enable Vercel Analytics

**Project → Analytics → Enable** (no code required beyond `@vercel/analytics` in layout).

---

## 3. Supabase production

Dashboard: [supabase.com](https://supabase.com) → your project

1. **SQL Editor** — run [`supabase/schema.sql`](supabase/schema.sql) if tables are missing (`profiles`, `songs`, `purchase_orders`, etc.)
2. **Authentication → URL Configuration**
   - Site URL: `https://damoneyfam.com`
   - Redirect URLs: `https://damoneyfam.com/auth/callback`
3. **Authentication → Providers** — enable Email and/or Google as needed
4. Copy API keys into Vercel env vars (step 2)

---

## 4. GoDaddy DNS (domain only — site is hosted on Vercel)

Dashboard: GoDaddy → **My Products → damoneyfam.com → DNS**

### Required records

| Type | Name | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

### Remove conflicting records

Delete or disable old records pointing to:
- GoDaddy Website Builder / parked page IPs
- Previous hosting provider A records
- Duplicate `@` A records not pointing to Vercel

Confirm in **Vercel → Domains** that `damoneyfam.com` and `www.damoneyfam.com` show **Valid Configuration**.

---

## 5. Analytics — why GoDaddy stats look empty

GoDaddy only counts **HTTP traffic to pages it hosts**. Because **Vercel serves damoneyfam.com**, page views appear in:

- **Vercel Analytics** (enable in project dashboard)
- **Google Analytics 4** (set `NEXT_PUBLIC_GA_MEASUREMENT_ID` on Vercel)

GoDaddy remains your **domain registrar and DNS** — not your web traffic analytics source.

---

## 6. Stripe live setup

Dashboard: [Stripe → Live mode](https://dashboard.stripe.com) (toggle **Test mode** off)

### Products catalog

Most checkouts (songs, merch, bundles, services, Coinz) use **dynamic `price_data`** at checkout — an empty Products tab is normal. You only need one pre-created subscription product:

| Product | Price | Env var |
|---------|-------|---------|
| DMF Fan Club | $9.00 USD / month (recurring) | `STRIPE_FAN_CLUB_PRICE_ID=price_...` |

Create: **Product catalog → Add product** → recurring monthly $9 → copy the **Price ID**.

### Webhook

**Developers → Webhooks → Add endpoint**

- URL: `https://damoneyfam.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET` on Vercel

### Customer portal

**Settings → Billing → Customer portal** — enable subscription cancel/update, save. Required for `/api/billing/portal` (“Manage subscription” on `/account`).

After env changes: **Deployments → ⋯ → Redeploy**.

---

## 7. Kick stream videos (after each new VOD)

Kick VOD links must use **`vod_id`** from the video URL — not the session slug.

1. Open the VOD on Kick: `https://kick.com/jackpotwrld/videos/{vod_id}`
2. Copy the `{vod_id}` segment (e.g. `019f9fd2-a128-7b26-bca4-96ed3e7ea297`)
3. Add or update the entry in [`src/data/kick-videos.ts`](src/data/kick-videos.ts) with that `vodId` and `watchUrl`
4. Deploy and verify `https://damoneyfam.com/api/kick/videos` — first video `watchUrl` must contain the vod_id

**Do not** use the session slug (e.g. `160002aa-dmf-cookout`) — those URLs 404.

---

## 8. Verify the live site

After redeploy, open [https://damoneyfam.com](https://damoneyfam.com) and confirm:

**Should be present:**
- Song Store section
- DMF Reputation card (not full old Fan Dashboard)
- 25-second music previews
- `/admin` login works

**Should be gone:**
- "Song Request Queue LIVE BIDDING"
- Full Fan Impact Hub
- Director's Cut interactive video block

Hard-refresh (Ctrl+Shift+R) or try incognito if you still see the old UI (DNS/cache).

---

## 9. Audio files on production

MP3s are **not in GitHub** (by design). On Vercel:

- Upload songs via **Admin → Add Song**, or
- Use **Supabase Storage** / external storage for persistent audio (Vercel filesystem is ephemeral)

Downloads only work after purchase via `/api/download/[token]`.
