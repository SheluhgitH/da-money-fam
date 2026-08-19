'use client'

import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'
import { scrollToSection } from '../utils/scrollToSection'
import { useState, useEffect, useMemo, useRef } from 'react'
import BackgroundVideo from './BackgroundVideo'
import MagneticButton from './MagneticButton'
import { asHeroSettings, type HomepageHeroSettings } from '@/lib/site-settings'

interface TakeoverConfig {
  artistName: string
  tagline: string
  videoSrc: string
  active: boolean
}

const activeTakeover: TakeoverConfig = {
  artistName: 'Vlone Tr3',
  tagline: 'Exclusive Takeover Day - Experience the Full Vlone Collection',
  videoSrc: '/videos/background.mp4',
  active: false,
}

const HEADLINE = 'DA MONEY FAM'

export default function HeroSection() {
  const [hero, setHero] = useState<HomepageHeroSettings>(asHeroSettings(null))
  const isTakeover = activeTakeover.active
  const sectionRef = useRef<HTMLElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 60, damping: 18 })
  const springY = useSpring(mouseY, { stiffness: 60, damping: 18 })
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6])
  const parallaxX = useTransform(springX, [-0.5, 0.5], [24, -24])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const contentScale = useTransform(scrollYProgress, [0, 0.7], [1, 0.86])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.15])
  const contentBlur = useTransform(scrollYProgress, [0, 0.7], [0, 10])
  const contentY = useTransform(scrollYProgress, [0, 0.7], [0, -80])
  const filter = useTransform(contentBlur, (v) => `blur(${v}px)`)

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((data) => setHero(asHeroSettings(data.settings?.['homepage.hero'])))
      .catch(() => {})
  }, [])

  return (
    <section
      ref={sectionRef}
      id="home"
      onMouseMove={handleMouseMove}
      className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="ken-burns absolute inset-0">
          <BackgroundVideo
            src={isTakeover ? activeTakeover.videoSrc : '/videos/jackpot-notebook-2.mp4'}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            isTakeover
              ? 'bg-gradient-to-b from-red-900/40 via-black/60 to-matte-black'
              : 'bg-gradient-to-b from-black/60 via-black/40 to-matte-black'
          }`}
        />
        <div className="hero-fog" aria-hidden />
        <div className="hero-grain" aria-hidden />
        <div className="hero-vignette" aria-hidden />
      </div>

      {isTakeover && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-600 text-white px-6 py-1 rounded-full text-[10px] font-bold uppercase tracking-[4px] animate-pulse"
          >
            LIVE ARTIST TAKEOVER
          </motion.div>
        </div>
      )}

      <motion.div
        style={{
          scale: contentScale,
          opacity: contentOpacity,
          filter,
          y: contentY,
          rotateX,
          rotateY,
          x: parallaxX,
          transformPerspective: 1200,
        }}
        className="relative z-10 text-center px-4 max-w-4xl mx-auto will-change-transform"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-gold uppercase tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm md:text-base mb-4"
        >
          {isTakeover ? `Featuring ${activeTakeover.artistName}` : hero.kicker}
        </motion.p>

        {isTakeover ? (
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.7 }}
            className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 text-white drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]"
          >
            {activeTakeover.artistName}
          </motion.h1>
        ) : (
          <h1 className="font-serif text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold mb-4 sm:mb-6 holographic-text">
            {(hero.headline || HEADLINE).split('').map((char, i) => (
              <motion.span
                key={`${char}-${i}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.55 + i * 0.04 }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </h1>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 px-2"
        >
          {isTakeover
            ? activeTakeover.tagline
            : hero.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <MagneticButton>
            <a
              href="https://youtu.be/3OHv8ZYsVb8?si=zVxqZL2KLAMHVKN-"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full sm:w-auto px-8 py-4 bg-gold text-matte-black font-bold uppercase tracking-widest text-sm hover:bg-gold-light transition-colors duration-300 neon-border text-center"
            >
              {hero.primaryCta}
            </a>
          </MagneticButton>

          <MagneticButton>
            <button
              type="button"
              onClick={() => scrollToSection('store')}
              className="w-full sm:w-auto px-8 py-4 glass text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-colors duration-300 border border-gold/50"
            >
              {hero.secondaryCta}
            </button>
          </MagneticButton>
        </motion.div>
      </motion.div>

      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: 'easeOut' }}
        onClick={() => scrollToSection('streams')}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full glass-gold border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-gold/10 transition-colors"
      >
        <motion.span
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-flex items-center gap-2"
        >
          Explore
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.span>
      </motion.button>

      <ParticleConstellation mouseX={mouseX} mouseY={mouseY} />
    </section>
  )
}

function ParticleDot({
  top,
  left,
  size,
  delay,
  offset,
  mouseX,
  mouseY,
}: {
  top: number
  left: number
  size: number
  delay: number
  offset: number
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
}) {
  const x = useTransform(mouseX, [-0.5, 0.5], [-offset, offset])
  const y = useTransform(mouseY, [-0.5, 0.5], [-offset * 0.7, offset * 0.7])

  return (
    <motion.div
      className="absolute rounded-full bg-gold"
      style={{
        top: `${top}%`,
        left: `${left}%`,
        width: size,
        height: size,
        x,
        y,
      }}
      animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 3.2, repeat: Infinity, delay }}
    />
  )
}

function ParticleConstellation({
  mouseX,
  mouseY,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>
  mouseY: ReturnType<typeof useMotionValue<number>>
}) {
  const [mounted, setMounted] = useState(false)
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        top: (i * 37) % 100,
        left: (i * 53) % 100,
        size: 2 + (i % 3),
        delay: (i % 6) * 0.35,
        offset: 8 + i,
      })),
    []
  )

  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {particles.slice(0, 10).map((p, i) => {
          const next = particles[(i + 3) % particles.length]
          return (
            <line
              key={`line-${p.id}`}
              x1={`${p.left}%`}
              y1={`${p.top}%`}
              x2={`${next.left}%`}
              y2={`${next.top}%`}
              stroke="rgba(212,175,55,0.25)"
              strokeWidth="0.5"
            />
          )
        })}
      </svg>
      {particles.map((p) => (
        <ParticleDot
          key={p.id}
          top={p.top}
          left={p.left}
          size={p.size}
          delay={p.delay}
          offset={p.offset}
          mouseX={mouseX}
          mouseY={mouseY}
        />
      ))}
    </div>
  )
}
