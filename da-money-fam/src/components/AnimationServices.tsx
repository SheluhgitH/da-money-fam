'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const animationServices = [
  {
    id: 1,
    title: 'Commercial Animation',
    description: 'Professional video animation services for commercials and brand campaigns',
    icon: '🎬',
    features: ['Motion Graphics', '3D Animation', 'Brand Commercials', 'Product Demos'],
  },
  {
    id: 2,
    title: 'Music Videos',
    description: 'Cinematic music video production with cutting-edge visual effects',
    icon: '🎵',
    features: ['Visual Storytelling', 'VFX Compositing', 'Color Grading', 'Directorial Vision'],
  },
  {
    id: 3,
    title: 'Brand Identity',
    description: 'Dynamic animation packages that elevate brand presence',
    icon: '✨',
    features: ['Logo Animation', 'Intro/Outro Sequences', 'Social Media Content', 'Advertising'],
  },
  {
    id: 4,
    title: 'Motion Design',
    description: 'Sophisticated motion design for web, TV, and film',
    icon: '🎨',
    features: ['UI/UX Animation', 'Title Sequences', 'Title Sequences', 'Explainer Videos'],
  },
]

export default function AnimationServices() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

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
    <section className="max-w-7xl mx-auto">
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
          Animation Services
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-lg max-w-2xl mx-auto"
        >
          Transform your ideas into stunning animated content. Premium video animation services for brands and creators.
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
      >
        {animationServices.map((service) => (
          <motion.div
            key={service.id}
            variants={itemVariants}
            whileHover={{ y: -10 }}
            className="glass rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:neon-border group"
          >
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform"
            >
              {service.icon}
            </motion.div>

            <h3 className="font-serif text-2xl font-bold mb-3 group-hover:text-gold transition-colors duration-300">
              {service.title}
            </h3>

            <p className="text-gray-400 mb-6">
              {service.description}
            </p>

            <ul className="space-y-2 mb-8">
              {service.features.map((feature, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-500 flex items-center gap-2"
                >
                  <span className="text-gold">✦</span>
                  {feature}
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full px-6 py-3 glass-gold text-gold font-bold uppercase tracking-widest text-xs rounded-lg hover:bg-gold/10 transition-colors duration-300 border border-gold/50"
            >
              Learn More
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-20 text-center"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="glass-gold rounded-3xl p-12 max-w-4xl mx-auto neon-border"
        >
          <h3 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Ready to Bring Your Vision to Life?
          </h3>
           <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
             Let&apos;s create something extraordinary together. Contact us for a free consultation and quote.
           </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gold text-matte-black font-bold uppercase tracking-widest text-sm hover:bg-gold-light transition-colors duration-300"
            >
              Start Your Project
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 glass text-white font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-colors duration-300 border border-gold/50"
            >
              View Our Work
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
