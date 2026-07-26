'use client'

import { motion } from 'framer-motion'
import { scrollRevealViewport } from '@/lib/motion'

const POSTS = [
  {
    platform: 'Instagram',
    href: 'https://www.instagram.com/damoneyfam/',
    title: 'Studio nights & drip checks',
    blurb: 'Follow @damoneyfam for daily culture.',
  },
  {
    platform: 'TikTok',
    href: 'https://www.tiktok.com/@jackpotofficial',
    title: 'Behind the scenes clips',
    blurb: 'Short-form energy from JackPot.',
  },
  {
    platform: 'Kick',
    href: 'https://kick.com/jackpotwrld',
    title: 'Day with DMF streams',
    blurb: 'Live IRL + music moments.',
  },
  {
    platform: 'YouTube',
    href: 'https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-',
    title: 'Official visuals',
    blurb: 'Watch the latest releases.',
  },
]

export default function SocialWall() {
  return (
    <section className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={scrollRevealViewport}
        className="text-center mb-10"
      >
        <p className="text-gold text-[10px] font-bold tracking-[0.35em] uppercase mb-3">Stay Connected</p>
        <h2 className="font-serif text-3xl md:text-5xl gold-gradient">Social Wall</h2>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {POSTS.map((post, i) => (
          <motion.a
            key={post.platform}
            href={post.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollRevealViewport}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -6, scale: 1.02 }}
            className="group glass rounded-2xl border border-white/10 hover:border-gold/40 p-5 transition-colors"
          >
            <p className="text-gold text-[10px] font-bold uppercase tracking-[0.25em] mb-3">
              {post.platform}
            </p>
            <h3 className="text-white font-serif text-xl mb-2 group-hover:text-gold transition-colors">
              {post.title}
            </h3>
            <p className="text-gray-500 text-sm">{post.blurb}</p>
            <p className="mt-4 text-gold text-xs uppercase tracking-wider">Open →</p>
          </motion.a>
        ))}
      </div>
    </section>
  )
}
