'use client'

import { useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import HeroSection from '@/components/HeroSection'
import Navigation from '@/components/Navigation'
import MusicPlayer from '@/components/MusicPlayer'
import Footer from '@/components/Footer'
import FloatingShapes from '@/components/FloatingShapes'
import SongStore from '@/components/store/SongStore'
import AboutFamSection from '@/components/AboutFamSection'
import { scrollToSection } from '@/utils/scrollToSection'
import ReferralCapture from '@/components/ReferralCapture'
import { PreviewPlayerProvider } from '@/contexts/PreviewPlayerContext'
import { MiniCartProvider } from '@/contexts/MiniCartContext'
import StickyPreviewBar from '@/components/store/StickyPreviewBar'
import StickyShopBar from '@/components/StickyShopBar'
import MiniCartDrawer from '@/components/MiniCartDrawer'
import EmailCaptureModal from '@/components/EmailCaptureModal'
import ScrollSkewProvider from '@/components/ScrollSkewProvider'
import {
  asHomepageSections,
  type HomepageSectionId,
} from '@/lib/homepage-sections'

const StreamVideosSection = dynamic(() => import('@/components/StreamVideosSection'))
const AdStudioPromoSection = dynamic(() => import('@/components/AdStudioPromoSection'))
const CollectiveCollage = dynamic(() => import('@/components/CollectiveCollage'))
const ArtistRoster = dynamic(() => import('@/components/ArtistRoster'))
const SocialWall = dynamic(() => import('@/components/SocialWall'))
const MerchStore = dynamic(() => import('@/components/MerchStore'))
const MembershipCTA = dynamic(() => import('@/components/MembershipCTA'))
const TestimonialsCarousel = dynamic(() => import('@/components/TestimonialsCarousel'))
const DmfReputationCard = dynamic(() => import('@/components/DmfReputationCard'))
const TheVault = dynamic(() => import('@/components/TheVault'))
const FanPerksLadder = dynamic(() => import('@/components/FanPerksLadder'))
const FamSpotlights = dynamic(() => import('@/components/FamSpotlights'))
const EventCalendar = dynamic(() => import('@/components/EventCalendar'))
const BlogTeaser = dynamic(() => import('@/components/blog/BlogTeaser'))
const PricingVideoSection = dynamic(() => import('@/components/PricingVideoSection'))
const VideoEditingSection = dynamic(() => import('@/components/VideoEditingSection'))
const HeroVideoSection = dynamic(() => import('@/components/HeroVideoSection'))

const PAD = 'relative py-10 md:py-16 lg:py-20 px-4 md:px-8 lg:px-16'

function SectionShell({
  id,
  padded = true,
  children,
}: {
  id?: string
  padded?: boolean
  children: ReactNode
}) {
  return (
    <section id={id} className={padded ? PAD : 'relative'}>
      {children}
    </section>
  )
}

function renderSection(id: HomepageSectionId) {
  switch (id) {
    case 'songs':
      return (
        <SectionShell>
          <SongStore />
        </SectionShell>
      )
    case 'music':
      return (
        <SectionShell>
          <MusicPlayer />
        </SectionShell>
      )
    case 'about':
      return (
        <SectionShell>
          <AboutFamSection />
        </SectionShell>
      )
    case 'streams':
      return (
        <SectionShell>
          <StreamVideosSection />
        </SectionShell>
      )
    case 'ad-studio':
      return (
        <SectionShell>
          <AdStudioPromoSection />
        </SectionShell>
      )
    case 'collage':
      return (
        <SectionShell>
          <CollectiveCollage />
        </SectionShell>
      )
    case 'roster':
      return (
        <SectionShell>
          <ArtistRoster />
        </SectionShell>
      )
    case 'social':
      return (
        <SectionShell>
          <SocialWall />
        </SectionShell>
      )
    case 'merch':
      return (
        <SectionShell padded={false}>
          <MerchStore />
        </SectionShell>
      )
    case 'membership':
      return <MembershipCTA />
    case 'testimonials':
      return (
        <SectionShell>
          <TestimonialsCarousel />
        </SectionShell>
      )
    case 'perks':
      return (
        <section id="reputation" className="relative px-4 md:px-8 lg:px-16 py-10 md:py-16">
          <div className="max-w-5xl mx-auto mb-4 md:mb-6 text-center">
            <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-2">Level Up</p>
            <h2 className="font-serif text-2xl md:text-4xl text-white">Fan Perks &amp; Rewards</h2>
            <p className="text-gray-400 text-sm md:text-base mt-2 max-w-2xl mx-auto">
              Earn XP from daily check-ins, purchases, and engagement. Unlock discounts, badges, and early
              access — or jump straight to Fan Club.
            </p>
          </div>
          <DmfReputationCard />
          <div className="max-w-3xl mx-auto mt-8 md:mt-10">
            <TheVault />
          </div>
          <FanPerksLadder />
          <FamSpotlights />
        </section>
      )
    case 'events':
      return (
        <SectionShell>
          <EventCalendar />
        </SectionShell>
      )
    case 'blog':
      return (
        <SectionShell>
          <BlogTeaser />
        </SectionShell>
      )
    case 'pricing-video':
      return (
        <SectionShell padded={false}>
          <PricingVideoSection />
        </SectionShell>
      )
    case 'video-editing':
      return (
        <SectionShell>
          <VideoEditingSection />
        </SectionShell>
      )
    case 'hero-video':
      return (
        <SectionShell padded={false}>
          <HeroVideoSection />
        </SectionShell>
      )
    default:
      return null
  }
}

export default function HomePage() {
  const [sections, setSections] = useState(asHomepageSections(null))

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setSections(asHomepageSections(data.settings?.['homepage.sections'])))
      .catch(() => {})
  }, [])

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

      {sections.filter((row) => !row.hidden).map((row) => (
        <div key={row.id}>{renderSection(row.id)}</div>
      ))}

      <Footer />
      <StickyPreviewBar />
      <StickyShopBar />
      <MiniCartDrawer />
    </main>
    </MiniCartProvider>
    </PreviewPlayerProvider>
  )
}
