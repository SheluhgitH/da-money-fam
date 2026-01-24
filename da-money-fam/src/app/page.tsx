'use client'

import { motion } from 'framer-motion'
import HeroSection from '@/components/HeroSection'
import Navigation from '@/components/Navigation'
import MusicPlayer from '@/components/MusicPlayer'
import ArtistRoster from '@/components/ArtistRoster'
import EventCalendar from '@/components/EventCalendar'
import PricingSection from '@/components/PricingSection'
import PricingVideoSection from '@/components/PricingVideoSection'
import VideoEditingSection from '@/components/VideoEditingSection'
import Footer from '@/components/Footer'
import FloatingShapes from '@/components/FloatingShapes'
import HeroVideoSection from '@/components/HeroVideoSection'

export default function Home() {
  return (
    <main className="min-h-screen bg-matte-black">
      <Navigation />
      <FloatingShapes />

      <section className="relative">
        <HeroSection />
      </section>

      <section className="relative py-20 px-4 md:px-8 lg:px-16">
        <MusicPlayer />
      </section>

      <section className="relative">
        <HeroVideoSection />
      </section>

       <section className="relative py-20 px-4 md:px-8 lg:px-16">
         <ArtistRoster />
       </section>

        <section className="relative py-20 px-4 md:px-8 lg:px-16">
          <EventCalendar />
        </section>

         <section className="relative">
           <PricingVideoSection />
         </section>

         <section className="relative py-20 px-4 md:px-8 lg:px-16">
           <VideoEditingSection />
         </section>

         <section className="relative py-20 px-4 md:px-8 lg:px-16">
           <PricingSection />
         </section>

        <Footer />
    </main>
  )
}
