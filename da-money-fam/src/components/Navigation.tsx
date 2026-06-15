'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { scrollToSection } from '../utils/scrollToSection'
import { useAuth } from '@/contexts/AuthProvider'
import { useSiteSettings } from '@/contexts/SiteSettingsProvider'
import UserAvatar from '@/components/UserAvatar'
import type { UserProfile } from '@/types/store'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()
  const { showAnimations, toggleAnimations } = useSiteSettings()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }

    fetch('/api/user/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProfile(data?.profile || null))
      .catch(() => setProfile(null))
  }, [user])

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Music', href: '#music' },
    { name: 'Store', href: '#store' },
    { name: 'Artists', href: '#artists' },
    { name: 'Services', href: '#services' },
    { name: 'Contact', href: '#contact' },
  ]

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? 'glass py-3 md:py-4' : 'bg-transparent py-4 md:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-lg sm:text-xl md:text-2xl font-serif font-bold gold-gradient">
          Da Money Fam
        </button>

        <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href.slice(1))}
                  className="text-sm uppercase tracking-widest text-gray-300 hover:text-gold transition-colors duration-300 relative group"
                >
                  {link.name}
                </button>
              ))}

              {!loading && (
                user ? (
                  <div className="flex items-center gap-3 ml-2">
                    <Link href="/library" className="text-xs uppercase tracking-widest text-gold hover:text-white transition-colors">
                      Library
                    </Link>
                    <Link href="/coin-wallet" className="text-xs uppercase tracking-widest text-gold hover:text-white transition-colors">
                      Coinz
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-widest text-gray-300">Animations</span>
                      <label className="inline-flex relative items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" checked={showAnimations} onChange={toggleAnimations} />
                        <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold" />
                      </label>
                    </div>
                    <Link
                      href="/account/profile"
                      className="hover:opacity-90 transition-opacity"
                      title={profile?.display_name || 'Account'}
                    >
                      <UserAvatar
                        avatarUrl={profile?.avatar_url}
                        displayName={profile?.display_name}
                        email={user.email}
                        size="md"
                      />
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="ml-2 px-4 py-2 bg-gold text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-white transition-colors"
                  >
                    Sign In
                  </Link>
                )
              )}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden glass mt-4"
          >
            <div className="flex flex-col space-y-4 p-8">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => {
                    scrollToSection(link.href.slice(1))
                    setIsMenuOpen(false)
                  }}
                  className="text-lg uppercase tracking-widest text-gray-300 hover:text-gold transition-colors duration-300"
                >
                  {link.name}
                </button>
              ))}
              {!loading && (
                user ? (
                  <>
                    <Link href="/library" className="text-lg uppercase tracking-widest text-gold" onClick={() => setIsMenuOpen(false)}>
                      Library
                    </Link>
                    <Link href="/coin-wallet" className="text-lg uppercase tracking-widest text-gold" onClick={() => setIsMenuOpen(false)}>
                      Coinz
                    </Link>
                    <Link href="/account/profile" className="flex items-center gap-3 text-lg uppercase tracking-widest text-gold" onClick={() => setIsMenuOpen(false)}>
                      <UserAvatar
                        avatarUrl={profile?.avatar_url}
                        displayName={profile?.display_name}
                        email={user.email}
                        size="sm"
                      />
                      <span>{profile?.display_name || 'Profile'}</span>
                    </Link>
                    <Link href="/account" className="text-lg uppercase tracking-widest text-gray-400" onClick={() => setIsMenuOpen(false)}>
                      Account Settings
                    </Link>
                    <div className="flex items-center justify-between text-lg uppercase tracking-widest text-gray-300">
                      <span>Animations</span>
                      <label className="inline-flex relative items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" checked={showAnimations} onChange={toggleAnimations} />
                        <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold" />
                      </label>
                    </div>
                    <button
                      onClick={async () => { await signOut(); setIsMenuOpen(false) }}
                      className="text-lg uppercase tracking-widest text-gray-400"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-lg uppercase tracking-widest text-gold" onClick={() => setIsMenuOpen(false)}>
                    Sign In
                  </Link>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
