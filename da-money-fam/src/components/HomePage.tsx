'use client'

import { useEffect } from 'react'
import HeroSection from '@/components/HeroSection'
import Navigation from '@/components/Navigation'
import MusicPlayer from '@/components/MusicPlayer'
import ArtistRoster from '@/components/ArtistRoster'
import EventCalendar from '@/components/EventCalendar'
import PricingVideoSection from '@/components/PricingVideoSection'
import VideoEditingSection from '@/components/VideoEditingSection'
import Footer from '@/components/Footer'
import FloatingShapes from '@/components/FloatingShapes'
import HeroVideoSection from '@/components/HeroVideoSection'
import MerchStore from '@/components/MerchStore'
import DmfReputationCard from '@/components/DmfReputationCard'
import BlogTeaser from '@/components/blog/BlogTeaser'
import SongStore from '@/components/store/SongStore'
import StreamVideosSection from '@/components/StreamVideosSection'
import { scrollToSection } from '@/utils/scrollToSection'
import ReferralCapture from '@/components/ReferralCapture'
import CheckoutReturnHandler from '@/components/CheckoutReturnHandler'
import { PreviewPlayerProvider } from '@/contexts/PreviewPlayerContext'
import StickyPreviewBar from '@/components/store/StickyPreviewBar'

export default function HomePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const section =
      params.get('section') || window.location.hash.replace('#', '').split('?')[0]
    if (!section) return

    const timer = window.setTimeout(() => {
      scrollToSection(section)

      if (params.get('from') === 'stripe' || params.has('section')) {
        const url = new URL(window.location.href)
        url.searchParams.delete('from')
        url.searchParams.delete('section')
        const query = url.searchParams.toString()
        const nextUrl = `${url.pathname}${query ? `?${query}` : ''}#${section}`
        window.history.replaceState({}, '', nextUrl)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <PreviewPlayerProvider>
    <ReferralCapture />
    <main className="min-h-screen bg-matte-black">
      <Navigation />
      <FloatingShapes />

      <section className="relative">
        <HeroSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <SongStore />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <StreamVideosSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <ArtistRoster />
      </section>

      <section className="relative">
        <MerchStore />
      </section>

      <section id="reputation" className="relative px-4 md:px-8 lg:px-16 py-10 md:py-16">
        <DmfReputationCard />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <EventCalendar />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <BlogTeaser />
      </section>

      <section className="relative">
        <PricingVideoSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <VideoEditingSection />
      </section>

      <section className="relative">
        <HeroVideoSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <MusicPlayer />
      </section>

      <Footer />
      <StickyPreviewBar />
    </main>
    </PreviewPlayerProvider>
  )
}
