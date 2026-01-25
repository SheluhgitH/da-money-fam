'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { subscribeNewsletter } from '../app/actions/newsletter'
import { scrollToSection } from '../utils/scrollToSection'

const socialLinks = [
  {
    name: 'Instagram',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4.162 4.162 0 1 1 0-8.324A4.162 4.162 0 0 1 12 16zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
    href: 'https://www.instagram.com/damoneyfam/'
  },
  {
    name: 'X',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    href: 'https://twitter.com/damoneyfam'
  },
  {
    name: 'YouTube',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505a3.017 3.017 0 0 0-2.122 2.136C.302 8.068.302 12 .302 12s0 3.932.199 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C23.698 15.932 23.698 12 23.698 12s0-3.932-.2-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    href: 'https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-'
  },
  {
    name: 'TikTok',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
      </svg>
    ),
    href: 'https://www.tiktok.com/@jackpotofficial?_r=1&_t=ZP-93KH1QM9PwM'
  },
  {
    name: 'Spotify',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.1 16.15c-.15.25-.45.3-.7.15-2.2-1.3-5-1.6-8.2-.9-.3.05-.55-.15-.6-.4s.15-.55.4-.6c3.5-.8 6.7-.4 9.1 1 .25.15.35.45.2.75zm1.3-3.05c-.2.3-.6.4-.9.2-2.5-1.5-6.3-2-8.6-1.3-.35.1-.7-.1-.8-.45s.1-.7.45-.8c2.8-.85 7-.3 9.8 1.45.3.15.4.55.25.9zM18.5 9.5c-3-1.8-8-1.95-10.9-1.1-.45.15-.9-.1-.1.05-.55s.1-.9.55-1.05c3.35-1 8.85-.8 12.35 1.3.4.25.55.75.3 1.15-.25.45-.8.6-1.2.35z" />
      </svg>
    ),
    href: 'https://open.spotify.com/artist/3OHv8ZYsVb8'
  },
  {
    name: 'Apple Music',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.36 12.33c0 2.02-1.64 3.66-3.66 3.66s-3.66-1.64-3.66-3.66 1.64-3.66 3.66-3.66c.26 0 .52.03.77.08V7.54l4.24-1.13v5.82c-.44-.33-.98-.54-1.57-.54-.11 0-.21.01-.32.02-.02 0-.04.01-.06.01-.15.02-.3.05-.44.09l-.44.13-.52.19z" />
      </svg>
    ),
    href: 'https://music.apple.com/artist/damoneyfam'
  },
  {
    name: 'SoundCloud',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="url(#gold-icon-grad)" d="M10.5 16h6.75c1.24 0 2.25-1.01 2.25-2.25s-1.01-2.25-2.25-2.25c-.13 0-.26.01-.38.04C16.34 9.61 14.54 8 12.38 8c-1.54 0-2.88.82-3.63 2.05-.28-.16-.6-.25-.94-.25-1.04 0-1.88.84-1.88 1.88 0 .28.06.54.17.78-.96.22-1.67 1.08-1.67 2.11C4.43 15.65 5.28 16.5 6.33 16.5c.08 0 .15-.01.22-.02.43 0 .78.35.78.78s-.35.78-.78.78h.75zM11 15V9h.75v6H11zm-1.5 0V10.5h.75V15H9.5zm-1.5 0V11h.75v4H8zm-1.5 0V12h.75v3h-.75zm-1.5 0V13h.75v2h-.75z" />
      </svg>
    ),
    href: 'https://m.soundcloud.com/yvng-lotto/emastered_lotto-devil-inside'
  },
]

export default function Footer() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+(?:\.[^\s@]+)+$/
    return regex.test(email)
  }

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string
    setEmailError('')

    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      await subscribeNewsletter(formData)
      setSubmitMessage('Subscribed! Stay tuned for updates.')
    } catch (error) {
      setSubmitMessage('Failed to subscribe. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <footer className="relative py-20 px-4 md:px-8 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto relative z-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <h3 className="font-serif text-3xl font-bold gold-gradient mb-4">
              DA MONEY FAM
            </h3>
            <p className="text-gray-400 mb-6">
              Setting trends in music, fashion, and culture. Luxury hip-hop collective redefining the industry.
            </p>
            <div className="flex gap-4">
              {/* Shared SVG Gradient Definition */}
              <svg className="absolute w-0 h-0" aria-hidden="true">
                <defs>
                  <linearGradient id="gold-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D4AF37" />
                    <stop offset="50%" stopColor="#E5C15D" />
                    <stop offset="100%" stopColor="#B8962E" />
                  </linearGradient>
                </defs>
              </svg>

              {socialLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{
                    scale: 1.2,
                    y: -5,
                    boxShadow: "0 0 15px rgba(212, 175, 55, 0.4)"
                  }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 glass rounded-full flex items-center justify-center text-gold hover:border-gold transition-all duration-300"
                  style={{ fill: "url(#gold-icon-grad)" }}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {link.icon}
                  </div>
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-serif text-xl font-bold text-gold mb-6">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {['Home', 'Music', 'Artists', 'Events', 'Contact', 'Merch'].map((link) => (
                <li key={link}>
                  <motion.button
                    onClick={() => scrollToSection(link.toLowerCase())}
                    whileHover={{ x: 5 }}
                    className="text-gray-400 hover:text-gold transition-colors duration-300"
                  >
                    {link}
                  </motion.button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-xl font-bold text-gold mb-6">
              Newsletter
            </h4>
            <p className="text-gray-400 mb-4">
              Subscribe for exclusive releases, events, and updates
            </p>
            <form action={handleSubmit} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-colors"
                />
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gold text-black font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-gold-light transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </motion.button>
              </div>
              {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
              {submitMessage && <p className="text-white mt-2">{submitMessage}</p>}
            </form>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 Da Money Fam. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gold transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gold transition-colors">Contact</a>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
