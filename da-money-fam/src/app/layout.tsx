import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/contexts/AuthProvider'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsProvider'
import CheckoutReturnHandler from '@/components/CheckoutReturnHandler'
import CosmeticGiftReveal from '@/components/profile/CosmeticGiftReveal'
import FallingObjects from '@/components/FallingObjects'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import ClientErrorReporter from '@/components/ClientErrorReporter'
import './globals.css'

const PremiumChat = dynamic(() => import('@/components/PremiumChat'), { ssr: false })

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Da Money Fam | Luxury Hip-Hop Collective',
  description:
    'Award-winning luxury hip-hop collective — music, merch, Fan Club, and Ad Studio for culture-forward creators.',
  keywords: ['hip-hop', 'music', 'collective', 'luxury', 'DMF', 'Ad Studio', 'Fan Club'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com'),
  openGraph: {
    title: 'Da Money Fam | Luxury Hip-Hop Collective',
    description:
      'Music, merch, Fan Club, and AI Ad Studio from Da Money Fam.',
    type: 'website',
    siteName: 'Da Money Fam',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Da Money Fam | Luxury Hip-Hop Collective',
    description: 'Music, merch, Fan Club, and AI Ad Studio from Da Money Fam.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased overflow-x-hidden`}>
        <SiteSettingsProvider>
          <AuthProvider>
            <CheckoutReturnHandler />
            <CosmeticGiftReveal />
            {children}
            <Suspense fallback={null}>
              <PremiumChat />
            </Suspense>
          </AuthProvider>
          <FallingObjects />
        </SiteSettingsProvider>
        <GoogleAnalytics />
        <ClientErrorReporter />
        <Analytics />
      </body>
    </html>
  )
}
