# Deployment Guide — Da Money Fam

Production site: **https://damoneyfam.com**  
Hosting: **Vercel** | Domain DNS: **GoDaddy** | Database/Auth: **Supabase**

For the full step-by-step checklist (Vercel, Supabase, GoDaddy DNS, analytics), see **[PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)**.

---

## Critical: which GitHub repo Vercel uses

Vercel is connected to **`SheluhgitH/da-money-fam`** (`origin` remote).

After every update, push to **both** remotes:

```powershell
cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2"
git push origin main
git push live main
```

Pushing only to `Site-2` (`live`) will **not** update damoneyfam.com.

---

## Local development

```powershell
cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam"
cp .env.example .env.local
# Fill in Supabase, Stripe, etc.
npm install
npm run dev
```

Open http://localhost:3005

---

## Vercel project settings

| Setting | Value |
|---------|-------|
| Root Directory | `da-money-fam` |
| Production Branch | `main` |
| Framework | Next.js |

Set `NEXT_PUBLIC_SITE_URL=https://damoneyfam.com` and all keys from [`.env.example`](.env.example) in Vercel → Environment Variables.

---

## Analytics

- **Vercel Analytics**: Enable in Vercel project → Analytics tab (`@vercel/analytics` is in the app).
- **Google Analytics 4**: Create a GA4 property, set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX` on Vercel.
- **GoDaddy website stats** will not show page views when Vercel serves the site — use Vercel + GA4 instead. See PRODUCTION-CHECKLIST.md §5.

---

## Audio security

Full tracks are **not** committed to Git. They live in `data/private-audio/` on the server or are uploaded via Admin. Purchases use tokenized downloads only.

---

## Test before deploy

```powershell
cd da-money-fam
npm run build
npm run start
```

Verify: store, previews, admin login, contact form, no console errors.
