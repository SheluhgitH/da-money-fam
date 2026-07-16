import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from '@/contexts/AuthProvider'
import { SiteSettingsProvider } from '@/contexts/SiteSettingsProvider'
import CheckoutReturnHandler from '@/components/CheckoutReturnHandler'
import FallingObjects from '@/components/FallingObjects'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

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
  description: 'Award-winning luxury hip-hop collective setting trends in music, fashion, and culture.',
  keywords: ['hip-hop', 'music', 'collective', 'luxury', 'DMF'],
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
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased`}>
        <SiteSettingsProvider>
          <AuthProvider>
            <CheckoutReturnHandler />
            {children}
          </AuthProvider>
          <FallingObjects />
        </SiteSettingsProvider>
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  )
}
