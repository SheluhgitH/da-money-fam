'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { subscribeNewsletter } from '../app/actions/newsletter'
import { scrollToSection } from '../utils/scrollToSection'

const socialLinks = [
  { name: 'Instagram', icon: '📷', href: 'https://www.instagram.com/damoneyfam/' },
  { name: 'Twitter', icon: '🐦', href: 'https://www.instagram.com/damoneyfam/' },
  { name: 'YouTube', icon: '▶️', href: 'https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-' },
  { name: 'TikTok', icon: '🎵', href: 'https://www.tiktok.com/@jackpotofficial?_r=1&_t=ZP-93KH1QM9PwM' },
  { name: 'Spotify', icon: '🎧', href: 'https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-' },
  { name: 'Apple Music', icon: '🍎', href: 'https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-' },
  { name: 'SoundCloud', icon: '☁️', href: 'https://m.soundcloud.com/yvng-lotto/emastered_lotto-devil-inside' },
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
              {socialLinks.map((link) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 glass rounded-full flex items-center justify-center text-xl hover:border-gold/50 transition-colors"
                >
                  {link.icon}
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
