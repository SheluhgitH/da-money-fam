'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import ArtistGallery from './ArtistGallery'

const allArtists = [
  {
    id: 1,
    name: 'JackPot',
    role: 'Lead Artist',
    mainImage: '/images/IMG_1222.png',
    description: 'Chart-topping lyricist with a unique flow',
    gallery: [
      { id: 'jp1', src: '/images/IMG_1222.png', alt: 'JackPot 1' },
      { id: 'jp2', src: '/images/IMG_1223.png', alt: 'JackPot 2' },
      { id: 'jp3', src: '/images/jackpot-extra-1.PNG', alt: 'JackPot 3' },
      { id: 'jp4', src: '/images/jackpot-magazine-1.jpg', alt: 'JackPot Magazine 1' },
      { id: 'jp5', src: '/images/jackpot-magazine-2.jpg', alt: 'JackPot Magazine 2' },
      { id: 'jp6', src: '/images/jackpot-extra-2.PNG', alt: 'JackPot 6' },
      { id: 'jp7', src: '/images/jackpot-extra-3.PNG', alt: 'JackPot 7' },
      { id: 'jp8', src: '/images/jackpot-extra-4.PNG', alt: 'JackPot 8' },
    ],
  },
  {
    id: 2,
    name: 'Vlone Tr3',
    role: 'Producer',
    mainImage: '/images/vlonetr3-2.png',
    description: 'Multi-platinum producer defining the sound',
    gallery: [
      { id: 'vl1', src: '/images/vlonetr3-2.png', alt: 'Vlone Tr3 1' },
      { id: 'vl2', src: '/images/vlonetr3-1.png', alt: 'Vlone Tr3 2' },
    ],
  },
  {
    id: 3,
    name: 'JayBandz',
    role: 'Vocalist',
    mainImage: null,
    description: 'Soulful vocals with luxury attitude',
    gallery: [],
  },
  {
    id: 4,
    name: 'SideShowDaPlug',
    role: 'Rapper',
    mainImage: '/images/sideshowdaplug-1.png',
    description: 'Hard-hitting bars and magnetic stage presence',
    gallery: [
      { id: 'ss1', src: '/images/sideshowdaplug-1.png', alt: 'SideShowDaPlug 1' },
      { id: 'ss2', src: '/images/sideshowdaplug-2.png', alt: 'SideShowDaPlug 2' },
      { id: 'ss3', src: '/images/sideshowdaplug-3.png', alt: 'SideShowDaPlug 3' },
    ],
  },
  {
    id: 5,
    name: 'RhyteHandP',
    role: 'Artist',
    mainImage: null,
    description: 'Innovative artist pushing creative boundaries',
    gallery: [],
  },
  {
    id: 6,
    name: 'JaleelDaGenesis',
    role: 'Artist',
    mainImage: null,
    description: 'Genesis of new sounds and visuals',
    gallery: [],
  },
]

export default function ArtistRoster() {
  const [expanded, setExpanded] = useState(false)
  const [activeGallery, setActiveGallery] = useState<string | null>(null)
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

  const handleCardClick = (artist: typeof allArtists[0]) => {
    if (artist.gallery.length > 0) {
      setActiveGallery(artist.name)
    }
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
            onClick={() => handleCardClick(artist)}
            style={artist.gallery.length > 0 ? { cursor: 'pointer' } : undefined}
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
                   {artist.mainImage ? (
                     <img
                       src={artist.mainImage}
                       alt={artist.name}
                       className="w-full h-full object-cover object-top"
                     />
                   ) : (
                     <svg className="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                     </svg>
                   )}
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
                {artist.gallery.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-gold/70 text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Click to view gallery ({artist.gallery.length} photos)</span>
                  </div>
                )}
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

      {allArtists.map((artist) => (
        <ArtistGallery
          key={artist.id}
          isOpen={activeGallery === artist.name}
          onClose={() => setActiveGallery(null)}
          images={artist.gallery}
          artistName={artist.name}
        />
      ))}
    </section>
  )
}
