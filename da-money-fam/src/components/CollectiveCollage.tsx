'use client'

import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import ArtistGallery from './ArtistGallery'
import { scrollRevealInView } from '@/lib/motion'
import { collectiveImages } from '@/data/collective'

const FLOAT_LAYOUT = [
  { top: '4%', left: '6%', rotate: -6, size: 'w-36 md:w-48', delay: 0 },
  { top: '8%', left: '38%', rotate: 4, size: 'w-40 md:w-56', delay: 0.05 },
  { top: '2%', left: '68%', rotate: -3, size: 'w-32 md:w-44', delay: 0.1 },
  { top: '28%', left: '18%', rotate: 5, size: 'w-36 md:w-52', delay: 0.15 },
  { top: '32%', left: '48%', rotate: -4, size: 'w-44 md:w-60', delay: 0.2 },
  { top: '26%', left: '76%', rotate: 7, size: 'w-32 md:w-48', delay: 0.25 },
  { top: '54%', left: '4%', rotate: -5, size: 'w-40 md:w-52', delay: 0.3 },
  { top: '58%', left: '34%', rotate: 3, size: 'w-36 md:w-48', delay: 0.35 },
  { top: '52%', left: '62%', rotate: -7, size: 'w-40 md:w-56', delay: 0.4 },
  { top: '56%', left: '84%', rotate: 4, size: 'w-28 md:w-40', delay: 0.45 },
  { top: '78%', left: '14%', rotate: 6, size: 'w-32 md:w-44', delay: 0.5 },
  { top: '82%', left: '42%', rotate: -2, size: 'w-36 md:w-52', delay: 0.55 },
  { top: '76%', left: '70%', rotate: 5, size: 'w-32 md:w-48', delay: 0.6 },
  { top: '18%', left: '88%', rotate: -8, size: 'w-28 md:w-36', delay: 0.65 },
  { top: '42%', left: '2%', rotate: 2, size: 'w-28 md:w-40', delay: 0.7 },
] as const

function FloatingShot({
  image,
  layout,
  index,
  onOpen,
}: {
  image: (typeof collectiveImages)[number]
  layout: (typeof FLOAT_LAYOUT)[number]
  index: number
  onOpen: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: layout.delay }}
      animate={{
        y: [0, index % 2 === 0 ? -10 : 10, 0],
        rotate: [layout.rotate, layout.rotate + 1.5, layout.rotate],
      }}
      whileHover={{ scale: 1.08, zIndex: 20, rotate: 0 }}
      style={{ top: layout.top, left: layout.left }}
      className={`absolute ${layout.size} aspect-[3/4] z-10 cursor-pointer group text-left`}
    >
      <div className="absolute -inset-3 bg-gold/15 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative w-full h-full overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[0_20px_50px_rgba(0,0,0,0.45)] group-hover:border-gold/50 transition-colors">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(max-width: 768px) 40vw, 220px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
    </motion.button>
  )
}

export default function CollectiveCollage() {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef(null)
  const isInView = useInView(headerRef, scrollRevealInView)

  return (
    <section id="collective" ref={sectionRef} className="relative max-w-7xl mx-auto">
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.55 }}
        className="text-center mb-8 md:mb-12 relative z-20"
      >
        <p className="text-gold text-[10px] sm:text-xs font-bold tracking-[5px] uppercase mb-3">
          Behind the Culture
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold gold-gradient mb-3 md:mb-4">
          Fam Moments
        </h2>
        <p className="text-gray-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
          A living collage of the crew — tap any frame to open the full gallery.
        </p>
      </motion.div>

      {/* Desktop / tablet floating collage */}
      <div className="relative hidden md:block h-[720px] lg:h-[820px]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.08),transparent_65%)]" />
        {collectiveImages.map((image, index) => (
          <FloatingShot
            key={image.id}
            image={image}
            layout={FLOAT_LAYOUT[index % FLOAT_LAYOUT.length]}
            index={index}
            onOpen={() => setGalleryOpen(true)}
          />
        ))}
      </div>

      {/* Mobile mosaic */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        {collectiveImages.map((image, index) => (
          <motion.button
            key={image.id}
            type="button"
            onClick={() => setGalleryOpen(true)}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
            className={`relative overflow-hidden rounded-xl border border-white/10 aspect-[3/4] ${
              index % 5 === 0 ? 'col-span-2 aspect-[16/10]' : ''
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </motion.button>
        ))}
      </div>

      <div className="text-center mt-8 md:mt-4 relative z-20">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setGalleryOpen(true)}
          className="px-8 py-3 glass-gold text-gold font-bold uppercase tracking-widest text-xs sm:text-sm border border-gold/50 hover:bg-gold/10 transition-colors"
        >
          Open Full Gallery
        </motion.button>
      </div>

      <ArtistGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={collectiveImages}
        artistName="Da Money Fam Collective"
      />
    </section>
  )
}
