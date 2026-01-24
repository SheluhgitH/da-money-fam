# Da Money Fam 💰🎵

A premium Next.js website for Da Money Fam - showcasing artists, music, animation services, and event calendar.

## 🌟 Features

- **Interactive Hero Section** with video background
- **Music Player** with playlist and track switching
- **Artist Roster** showcasing talent
- **Event Calendar** for upcoming shows and releases
- **Video Showcases** for animations and projects
- **Contact Form** with email integration (Resend API)
- **Smooth Animations** powered by Framer Motion
- **Fully Responsive** design for all devices

## 🛠️ Tech Stack

- **Framework**: Next.js 14.2 (React 18.3)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **3D Graphics**: Three.js with React Three Fiber
- **Email**: Resend API
- **Form Validation**: Yup

## 📦 Project Structure

```
da-money-fam/
├── public/
│   ├── audio/           # Music tracks
│   ├── images/          # Artist photos and images
│   └── videos/          # Background and showcase videos
├── src/
│   ├── app/
│   │   ├── actions/     # Server actions (email)
│   │   ├── globals.css  # Global styles
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Home page
│   ├── components/      # React components
│   └── utils/           # Utility functions
├── .env.local          # Environment variables (not committed)
├── .env.example        # Environment variable template
└── .gitignore          # Git ignore rules
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository** (or navigate to the project)
   ```bash
   cd "c:\Users\Pharp\Desktop\DMF APPS\Site 2\da-money-fam"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local`:
   ```bash
   copy .env.example .env.local
   ```
   
   Then edit `.env.local` and add your Resend API key:
   ```
   RESEND_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## 🎨 Components

### Core Components
- **Navigation** - Site navigation with mobile menu
- **HeroSection** - Main hero with video background
- **HeroVideoSection** - Video showcase with modal
- **MusicPlayer** - Audio player with playlist
- **ArtistRoster** - Artist profiles and roster
- **EventCalendar** - Upcoming events display
- **PricingSection** - Service pricing display
- **VideoEditingSection** - Video editing services showcase
- **ContactForm** - Contact form with validation
- **Footer** - Site footer with social links

### Utility Components
- **FloatingShapes** - Animated background shapes
- **Modal** - Reusable modal component

## 📧 Email Configuration

The contact form uses [Resend](https://resend.com) for email delivery.

### Setup:
1. Create account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to `.env.local`: `RESEND_API_KEY=your_key`
4. Configure your sender domain (or use testing domain)

### Email Recipients:
- Forms send to: `contact@damoneyfam.com`
- Update in `src/app/actions/sendEmail.ts` if needed

## 🎵 Media Files

### Audio Files
Located in `/public/audio/`:
- `wok audio - Made with Clipchamp.m4a` - Track 1
- `notebook audio for site.m4a` - Track 2

### Videos
Located in `/public/videos/`:
- `background.mp4` - Hero background
- `hero-video.mp4` - Main showcase video
- `jackpot-notebook-2.mp4` - Pricing section video

### Images
Located in `/public/images/`:
- Artist photos
- Placeholder images

## 🌐 Deployment

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for detailed deployment instructions.

### Quick Deploy to Vercel:
```bash
# Push to GitHub
git add .
git commit -m "Ready for deployment"
git push

# Then connect repo on vercel.com
# Add RESEND_API_KEY environment variable
# Deploy!
```

## 🔐 Environment Variables

Required environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | API key for Resend email service | Yes |

## 🐛 Troubleshooting

### Build Errors
- Run `npm run build` locally first
- Check for TypeScript errors
- Verify all dependencies are installed

### Audio Not Playing
- Verify files exist in `/public/audio/`
- Check browser console for errors
- Ensure file paths start with `/audio/`

### Email Not Sending
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for logs
- Verify sender email domain is configured

## 📝 License

Private project for Da Money Fam.

## 👥 Contact

- **Email**: contact@damoneyfam.com
- **Instagram**: [@damoneyfam](https://www.instagram.com/damoneyfam/)
- **YouTube**: [Da Money Fam](https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-)

---

**Built with ❤️ by Da Money Fam**
