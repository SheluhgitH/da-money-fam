'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

const allArtists = [
  {
    id: 1,
    name: 'JackPot',
    role: 'Lead Artist',
    image: '/images/jackpot (1).PNG',
    description: 'Chart-topping lyricist with a unique flow',
  },
  {
    id: 2,
    name: 'Vlone Tr3',
    role: 'Producer',
    image: '/images/artist-placeholder.jpg',
    description: 'Multi-platinum producer defining the sound',
  },
  {
    id: 3,
    name: 'JayBandz',
    role: 'Vocalist',
    image: '/images/artist-placeholder.jpg',
    description: 'Soulful vocals with luxury attitude',
  },
  {
    id: 4,
    name: 'SideShowDaPlug',
    role: 'Rapper',
    image: '/images/artist-placeholder.jpg',
    description: 'Hard-hitting bars and magnetic stage presence',
  },
  {
    id: 5,
    name: 'RhyteHandP',
    role: 'Artist',
    image: '/images/artist-placeholder.jpg',
    description: 'Innovative artist pushing creative boundaries',
  },
  {
    id: 6,
    name: 'JaleelDaGenesis',
    role: 'Artist',
    image: '/images/artist-placeholder.jpg',
    description: 'Genesis of new sounds and visuals',
  },
]

export default function ArtistRoster() {
  const [expanded, setExpanded] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  const artists = expanded ? allArtists : allArtists.slice(0, 4)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <section id="artists" ref={ref} className="max-w-7xl mx-auto">
      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="text-center mb-16"
      >
        <motion.h2
          variants={itemVariants}
          className="font-serif text-4xl md:text-6xl font-bold mb-4 gold-gradient"
        >
          The Collective
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-lg"
        >
          Meet the visionaries behind the movement
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {artists.map((artist) => (
          <motion.div
            key={artist.id}
            variants={itemVariants}
            whileHover={{ y: -10 }}
            className="group"
          >
            <motion.div
              className="glass rounded-2xl overflow-hidden transition-all duration-500 group-hover:border-gold/50 group-hover:neon-border"
            >
              <div className="relative aspect-square overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold-dark/20" />
                <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-transparent to-transparent" />
                 <motion.div
                   className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center"
                   whileHover={{ scale: 1.05 }}
                   transition={{ duration: 0.3 }}
                 >
                   <svg className="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                   </svg>
                 </motion.div>
              </div>

              <div className="p-6">
                <h3 className="font-serif text-2xl font-bold mb-1 group-hover:text-gold transition-colors duration-300">
                  {artist.name}
                </h3>
                <p className="text-gold text-sm uppercase tracking-wider mb-3">
                  {artist.role}
                </p>
                <p className="text-gray-400 text-sm">
                  {artist.description}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center mt-16"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setExpanded(!expanded)}
          className="px-8 py-4 glass-gold text-gold font-bold uppercase tracking-widest text-sm hover:bg-gold/10 transition-colors duration-300 border border-gold/50"
        >
          {expanded ? 'Show Less' : 'View All Artists'}
        </motion.button>
      </motion.div>
    </section>
  )
}
