'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { scrollToSection } from '../utils/scrollToSection'
import { useAuth } from '@/contexts/AuthProvider'
import { useSiteSettings } from '@/contexts/SiteSettingsProvider'
import UserAvatar from '@/components/UserAvatar'
import type { UserProfile } from '@/types/store'

export default function Navigation() {
  const pathname = usePathname()
  const isHome = pathname === '/'
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

    const loadProfile = () => {
      fetch('/api/user/profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setProfile(data?.profile || null))
        .catch(() => setProfile(null))
    }

    loadProfile()
    window.addEventListener('dmf-profile-updated', loadProfile)
    return () => window.removeEventListener('dmf-profile-updated', loadProfile)
  }, [user])

  const navLinks = [
    { name: 'Home', section: 'home' },
    { name: 'Store', section: 'store' },
    { name: 'Listen', section: 'music' },
    { name: 'Blog', href: '/blog', isRoute: true },
    { name: 'Artists', section: 'artists' },
    { name: 'Streams', section: 'streams' },
    { name: 'Services', section: 'services' },
    { name: 'Contact', section: 'contact' },
  ] as const

  const handleSectionNav = (section: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isHome) return
    e.preventDefault()
    scrollToSection(section)
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-[100] pointer-events-auto transition-all duration-500 ${
        isScrolled ? 'glass py-3 md:py-4' : 'bg-transparent py-4 md:py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
        <Link
          href="/"
          onClick={(e) => {
            if (isHome) {
              e.preventDefault()
              scrollToSection('home')
            }
          }}
          className="text-lg sm:text-xl md:text-2xl font-serif font-bold gold-gradient"
        >
          Da Money Fam
        </Link>

        <div className="hidden md:flex items-center space-x-6 relative z-10">
              {navLinks.map((link) =>
                'isRoute' in link && link.isRoute ? (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`text-sm uppercase tracking-widest transition-colors duration-300 ${
                      pathname.startsWith('/blog') ? 'text-gold hover:text-white' : 'text-gold hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                ) : 'section' in link ? (
                  <Link
                    key={link.name}
                    href={`/#${link.section}`}
                    onClick={(e) => handleSectionNav(link.section, e)}
                    className="text-sm uppercase tracking-widest text-gray-300 hover:text-gold transition-colors duration-300 relative group cursor-pointer"
                  >
                    {link.name}
                  </Link>
                ) : null
              )}

              {!loading && (
                user ? (
                  <div className="flex items-center gap-3 ml-2">
                    <Link href="/library" className="text-xs uppercase tracking-widest text-gold hover:text-white transition-colors">
                      Library
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
              {navLinks.map((link) =>
                'isRoute' in link && link.isRoute ? (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-lg uppercase tracking-widest text-gold"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ) : 'section' in link ? (
                  <Link
                    key={link.name}
                    href={`/#${link.section}`}
                    onClick={(e) => {
                      handleSectionNav(link.section, e)
                      setIsMenuOpen(false)
                    }}
                    className="text-lg uppercase tracking-widest text-gray-300 hover:text-gold transition-colors duration-300 cursor-pointer"
                  >
                    {link.name}
                  </Link>
                ) : null
              )}
              {!loading && (
                user ? (
                  <>
                    <Link href="/library" className="text-lg uppercase tracking-widest text-gold" onClick={() => setIsMenuOpen(false)}>
                      Library
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
