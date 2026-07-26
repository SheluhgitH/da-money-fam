'use client'

import { useEffect } from 'react'
import HeroSection from '@/components/HeroSection'
import Navigation from '@/components/Navigation'
import MusicPlayer from '@/components/MusicPlayer'
import ArtistRoster from '@/components/ArtistRoster'
import CollectiveCollage from '@/components/CollectiveCollage'
import EventCalendar from '@/components/EventCalendar'
import PricingVideoSection from '@/components/PricingVideoSection'
import VideoEditingSection from '@/components/VideoEditingSection'
import Footer from '@/components/Footer'
import FloatingShapes from '@/components/FloatingShapes'
import HeroVideoSection from '@/components/HeroVideoSection'
import MerchStore from '@/components/MerchStore'
import DmfReputationCard from '@/components/DmfReputationCard'
import FanPerksLadder from '@/components/FanPerksLadder'
import FamSpotlights from '@/components/FamSpotlights'
import BlogTeaser from '@/components/blog/BlogTeaser'
import SongStore from '@/components/store/SongStore'
import StreamVideosSection from '@/components/StreamVideosSection'
import { scrollToSection } from '@/utils/scrollToSection'
import ReferralCapture from '@/components/ReferralCapture'
import { PreviewPlayerProvider } from '@/contexts/PreviewPlayerContext'
import { MiniCartProvider } from '@/contexts/MiniCartContext'
import StickyPreviewBar from '@/components/store/StickyPreviewBar'
import StickyShopBar from '@/components/StickyShopBar'
import MiniCartDrawer from '@/components/MiniCartDrawer'
import MembershipCTA from '@/components/MembershipCTA'
import TestimonialsCarousel from '@/components/TestimonialsCarousel'
import SocialWall from '@/components/SocialWall'
import EmailCaptureModal from '@/components/EmailCaptureModal'
import ScrollSkewProvider from '@/components/ScrollSkewProvider'

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
    <MiniCartProvider>
    <ReferralCapture />
    <ScrollSkewProvider />
    <EmailCaptureModal />
    <main className="min-h-screen bg-matte-black pb-24 md:pb-12">
      <Navigation />
      <FloatingShapes />

      <section className="relative">
        <HeroSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <StreamVideosSection />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <CollectiveCollage />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <SongStore />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <ArtistRoster />
      </section>

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <SocialWall />
      </section>

      <section className="relative">
        <MerchStore />
      </section>

      <MembershipCTA />

      <section className="relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16">
        <TestimonialsCarousel />
      </section>

      <section id="reputation" className="relative px-4 md:px-8 lg:px-16 py-10 md:py-16">
        <div className="max-w-5xl mx-auto mb-4 md:mb-6 text-center">
          <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-2">Level Up</p>
          <h2 className="font-serif text-2xl md:text-4xl text-white">Fan Perks &amp; Rewards</h2>
          <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
            Earn XP from daily check-ins, purchases, and engagement. Unlock discounts, badges, and early access — or jump straight to Fan Club.
          </p>
        </div>
        <DmfReputationCard />
        <FanPerksLadder />
        <FamSpotlights />
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
      <StickyShopBar />
      <MiniCartDrawer />
    </main>
    </MiniCartProvider>
    </PreviewPlayerProvider>
  )
}
