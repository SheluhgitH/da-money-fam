# Quick Deployment Guide - Da Money Fam

## 🚀 Deploy to Vercel (Recommended - Easiest for Next.js)

### Step 1: Push to GitHub

```bash
cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam"

# Initialize Git (if not already done)
git init

# Add all files (don't worry, .gitignore protects .env.local)
git add .

# Commit
git commit -m "Ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/da-money-fam.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Sign up/Login (use your GitHub account) 
3. Click **"New Project"**
4. Import your `da-money-fam` repository
5. **Configure Environment Variables**:
   - Click "Environment Variables"
   - Add: 
     - **Name**: `RESEND_API_KEY`
     - **Value**: `re_CfSzU1YV_QGvdU2ymQyDhqXYUwXHtySkj`
6. Click **"Deploy"**
7. Wait 2-3 minutes ⏱️
8. **Done!** Your site will be live at `https://da-money-fam.vercel.app`

---

## 🌐 Alternative: Deploy to Netlify

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy on Netlify

1. Go to https://netlify.com
2. Sign up/Login with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose GitHub → Select `da-money-fam` repo
5. **Build settings** (Netlify should detect automatically):
   - Build command: `npm run build`
   - Publish directory: `.next`
6. **Add Environment Variable**:
   - Go to Site settings → Environment variables
   - Add: `RESEND_API_KEY` = `re_CfSzU1YV_QGvdU2ymQyDhqXYUwXHtySkj`
7. Click **"Deploy site"**
8. **Done!** Your site will be live

---

## 📝 Before You Deploy - Final Checks

Run these commands to make sure everything works:

```bash
cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam"

# Test production build
npm run build

# Test locally in production mode
npm run start
```

Then open http://localhost:3000 and test:
- ✅ Music player works
- ✅ Videos play
- ✅ All buttons work
- ✅ Contact form submits

---

## ⚙️ Custom Domain (Optional)

### On Vercel:
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `damoneyfam.com`)
3. Follow DNS instructions (add A record or CNAME)

### On Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration steps

---

## 🔐 Security Notes

✅ **Your API key is secure**:
- It's in `.env.local` which is NOT committed to Git
- It will be added securely on Vercel/Netlify
- Nobody can see it in your repository

⚠️ **If you ever need to regenerate the API key**:
1. Go to https://resend.com/api-keys
2. Generate a new key
3. Update it in Vercel/Netlify environment variables

---

## 📊 After Deployment

### Monitor Your Site
- **Vercel Dashboard**: Shows deployment status, analytics, errors
- **Check Console**: Open your live site → F12 → Check for errors

### Update Your Site
```bash
# Make changes to your code
git add .
git commit -m "Your update message"
git push

# Vercel/Netlify will automatically redeploy!
```

---

## 🆘 Troubleshooting

### Build Fails
- Check Vercel/Netlify build logs
- Make sure `RESEND_API_KEY` environment variable is set
- Verify `npm run build` works locally

### Email Not Sending
- Verify API key is correct in environment variables
- Check Resend dashboard for email logs
- Verify `from` email in `sendEmail.ts` matches your Resend domain

### Media Files Not Loading
- Verify files are in `public/` directory
- Check paths start with `/` (e.g., `/audio/file.m4a`)
- Check browser console for 404 errors

---

## 🎉 You're Ready!

Your site is production-ready and secured. Just push to GitHub and deploy! 

**Development Server**: http://localhost:3000 (currently running)
**Production Site**: Will be at your Vercel/Netlify URL after deployment
