'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import ArtistGallery from './ArtistGallery'
import { scrollRevealInView } from '@/lib/motion'
import { allArtists, type Artist } from '@/data/artists'

export default function ArtistRoster() {
  const [expanded, setExpanded] = useState(false)
  const [activeGallery, setActiveGallery] = useState<string | null>(null)
  const headerRef = useRef(null)
  const isInView = useInView(headerRef, scrollRevealInView)

  const sortedArtists = [...allArtists]
    .map((artist, index) => ({ artist, index }))
    .sort((a, b) => {
      if (a.artist.role === 'CEO') return -1
      if (b.artist.role === 'CEO') return 1
      return a.index - b.index
    })
    .map(({ artist }) => artist)
  const artists = expanded ? sortedArtists : sortedArtists.slice(0, 4)

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

  const handleCardClick = (artist: Artist) => {
    if (artist.gallery.length > 0) {
      setActiveGallery(artist.name)
    }
  }

  return (
    <section id="artists" className="max-w-7xl mx-auto">
      <motion.div
        ref={headerRef}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="text-center mb-8 md:mb-12 lg:mb-16"
      >
        <motion.h2
          variants={itemVariants}
          className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 gold-gradient"
        >
          The Collective
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-sm sm:text-base md:text-lg"
        >
          Meet the visionaries behind the movement
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
      >
        {artists.map((artist) => {
          const isCeo = artist.role === 'CEO'

          return (
          <motion.div
            key={artist.id}
            variants={itemVariants}
            whileHover={{ y: isCeo ? -10 : -8, scale: isCeo ? 1.03 : 1.02 }}
            className="group"
            onClick={() => handleCardClick(artist)}
            style={artist.gallery.length > 0 ? { cursor: 'pointer' } : undefined}
          >
            <motion.div
              className={`glass rounded-2xl overflow-hidden transition-all duration-500 bg-black/30 backdrop-blur-sm border ${
                isCeo
                  ? 'ceo-card border-gold/30'
                  : 'border-white/5 group-hover:border-gold/50 group-hover:neon-border'
              }`}
            >
              <div className="relative aspect-square overflow-hidden">
                {isCeo && <div className="ceo-card-hue z-[2]" />}
                {isCeo && <div className="ceo-card-shimmer z-[3]" />}
                <div className={`absolute inset-0 bg-gradient-to-br ${isCeo ? 'from-amber-500/25 to-gold-dark/30' : 'from-gold/20 to-gold-dark/20'}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-transparent to-transparent z-[1]" />
                <motion.div
                  className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center"
                  whileHover={{ scale: isCeo ? 1.06 : 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  {artist.mainImage ? (
                    <img
                      src={artist.mainImage}
                      alt={artist.name}
                      className={`w-full h-full object-cover ${isCeo ? 'object-center' : 'object-top'}`}
                    />
                  ) : (
                    <svg className="w-24 h-24 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </motion.div>
              </div>

              <div className="p-4 sm:p-5 md:p-6 relative z-[4]">
                <h3 className={`font-serif text-lg sm:text-xl md:text-2xl font-bold mb-1 transition-colors duration-300 ${isCeo ? 'group-hover:text-gold text-glow' : 'group-hover:text-gold'}`}>
                  {artist.name}
                </h3>
                <p className={`text-sm uppercase tracking-wider mb-3 ${isCeo ? 'text-amber-300 font-bold group-hover:text-gold-light' : 'text-gold'}`}>
                  {artist.role}
                </p>
                <p className="text-gray-400 text-sm">{artist.description}</p>
                {artist.gallery.length > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-gold/70 text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Click to view gallery ({artist.gallery.length} photos)</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )})}
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
