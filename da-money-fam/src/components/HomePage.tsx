'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import HeroSection from '@/components/HeroSection'
import Navigation from '@/components/Navigation'
import MusicPlayer from '@/components/MusicPlayer'
import Footer from '@/components/Footer'
import FloatingShapes from '@/components/FloatingShapes'
import SongStore from '@/components/store/SongStore'
import AboutFamSection from '@/components/AboutFamSection'
import HomepageTabBar from '@/components/HomepageTabBar'
import { scrollToSection } from '@/utils/scrollToSection'
import ReferralCapture from '@/components/ReferralCapture'
import { PreviewPlayerProvider } from '@/contexts/PreviewPlayerContext'
import { MiniCartProvider } from '@/contexts/MiniCartContext'
import StickyPreviewBar from '@/components/store/StickyPreviewBar'
import PreviewUpsellModal from '@/components/store/PreviewUpsellModal'
import StickyShopBar from '@/components/StickyShopBar'
import MiniCartDrawer from '@/components/MiniCartDrawer'
import EmailCaptureModal from '@/components/EmailCaptureModal'
import ScrollSkewProvider from '@/components/ScrollSkewProvider'
import {
  asHomepageSections,
  type HomepageSectionId,
} from '@/lib/homepage-sections'
import {
  DEFAULT_HOMEPAGE_TAB,
  getSectionsForTab,
  getVisibleTabs,
  hashToScrollTarget,
  HOMEPAGE_NAV_EVENT,
  resolveTabFromUrl,
  sectionToTab,
  type HomepageNavDetail,
  type HomepageTabId,
} from '@/lib/homepage-tabs'

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
  const [activeTab, setActiveTab] = useState<HomepageTabId>(DEFAULT_HOMEPAGE_TAB)
  const contentRef = useRef<HTMLDivElement>(null)
  const pendingScrollRef = useRef<string | null>(null)
  const initialUrlHandled = useRef(false)

  const visibleTabs = useMemo(() => getVisibleTabs(sections), [sections])
  const tabSections = useMemo(
    () => getSectionsForTab(activeTab, sections),
    [activeTab, sections]
  )

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setSections(asHomepageSections(data.settings?.['homepage.sections'])))
      .catch(() => {})
  }, [])

  // Ensure active tab stays valid when visibility changes
  useEffect(() => {
    if (visibleTabs.length === 0) return
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [visibleTabs, activeTab])

  const switchTab = useCallback(
    (tab: HomepageTabId, scrollTarget?: string | null, options?: { scrollToTop?: boolean }) => {
      pendingScrollRef.current = scrollTarget || null
      setActiveTab(tab)

      const url = new URL(window.location.href)
      url.searchParams.delete('tab')
      if (scrollTarget) {
        const query = url.searchParams.toString()
        window.history.replaceState(
          {},
          '',
          `${url.pathname}${query ? `?${query}` : ''}#${scrollTarget}`
        )
      } else {
        url.searchParams.set('tab', tab)
        const query = url.searchParams.toString()
        window.history.replaceState({}, '', `${url.pathname}?${query}`)
      }

      if (options?.scrollToTop !== false && !scrollTarget) {
        window.requestAnimationFrame(() => {
          const el = contentRef.current
          if (!el) return
          const top = el.getBoundingClientRect().top + window.scrollY - 100
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
        })
      }
    },
    []
  )

  // After tab content mounts, scroll to pending target
  useEffect(() => {
    const target = pendingScrollRef.current
    if (!target) return

    const timer = window.setTimeout(() => {
      scrollToSection(target)
      pendingScrollRef.current = null
    }, 80)

    return () => window.clearTimeout(timer)
  }, [activeTab, tabSections])

  // Initial URL: ?tab=, ?section=, #hash
  useEffect(() => {
    if (initialUrlHandled.current) return
    initialUrlHandled.current = true

    const params = new URLSearchParams(window.location.search)
    const { tab, scrollTarget } = resolveTabFromUrl({
      tabParam: params.get('tab'),
      sectionParam: params.get('section'),
      hash: window.location.hash,
    })

    pendingScrollRef.current = scrollTarget
    setActiveTab(tab)

    if (params.get('from') === 'stripe' || params.has('section')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('from')
      url.searchParams.delete('section')
      const query = url.searchParams.toString()
      const hash = scrollTarget || url.hash.replace('#', '')
      const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`
      window.history.replaceState({}, '', nextUrl)
    }

    if (scrollTarget) {
      const timer = window.setTimeout(() => {
        scrollToSection(scrollTarget)
        pendingScrollRef.current = null
      }, 350)
      return () => window.clearTimeout(timer)
    }
  }, [])

  // Nav / hero deep-links while already on homepage
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent<HomepageNavDetail>).detail
      const section = detail?.section
      if (!section) return

      if (section === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        window.history.replaceState(null, '', '/')
        return
      }

      if (section === 'contact') {
        scrollToSection('contact')
        return
      }

      const tab = sectionToTab(section)
      const target = hashToScrollTarget(section)
      if (tab) {
        if (tab === activeTab && target) {
          scrollToSection(target)
        } else {
          switchTab(tab, target, { scrollToTop: !target })
        }
      } else if (target) {
        scrollToSection(target)
      }
    }

    window.addEventListener(HOMEPAGE_NAV_EVENT, onNav)
    return () => window.removeEventListener(HOMEPAGE_NAV_EVENT, onNav)
  }, [activeTab, switchTab])

  const handleTabChange = (tab: HomepageTabId) => {
    switchTab(tab, null, { scrollToTop: true })
  }

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

      <HomepageTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        visibleTabs={visibleTabs}
      />

      <div
        ref={contentRef}
        id="homepage-tab-content"
        className="homepage-tab-content min-h-[50vh]"
        role="tabpanel"
        aria-labelledby={`homepage-tab-${activeTab}`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {tabSections.map((id) => (
              <div key={id}>{renderSection(id)}</div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
      <StickyPreviewBar />
      <PreviewUpsellModal />
      <StickyShopBar />
      <MiniCartDrawer />
    </main>
    </MiniCartProvider>
    </PreviewPlayerProvider>
  )
}
