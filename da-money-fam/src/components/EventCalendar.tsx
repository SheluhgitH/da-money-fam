'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const events = [
  {
    id: 1,
    title: 'World Tour Launch',
    date: 'February 15, 2026',
    location: 'Madison Square Garden, NYC',
    time: '8:00 PM',
    price: '$150 - $500',
    status: 'Selling Fast',
  },
  {
    id: 2,
    title: 'Luxury Fest 2026',
    date: 'March 20, 2026',
    location: 'LA Live, Los Angeles',
    time: '7:00 PM',
    price: '$100 - $400',
    status: 'Available',
  },
  {
    id: 3,
    title: 'Exclusive Album Release',
    date: 'April 5, 2026',
    location: 'The Forum, Inglewood',
    time: '9:00 PM',
    price: '$200 - $600',
    status: 'Presale',
  },
]

export default function EventCalendar() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <section id="events" ref={ref} className="max-w-7xl mx-auto">
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
          Upcoming Events
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-gray-400 text-lg"
        >
          Experience Da Money Fam live
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="relative"
      >
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold via-gold-dark to-transparent" />
        
        <div className="space-y-12">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              variants={itemVariants}
              className={`relative flex flex-col md:flex-row items-start md:items-center gap-8 ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              <motion.div
                className={`w-full md:w-1/2 ${index % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}
                whileHover={{ x: index % 2 === 0 ? 5 : -5 }}
              >
                <div className="glass rounded-2xl p-8 transition-all duration-500 hover:border-gold/50 hover:neon-border">
                  <div className="flex items-center gap-4 mb-4 md:justify-start">
                    <div className={`flex flex-col items-center md:flex-row ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                      <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border">
                        <span className="text-black font-serif font-bold text-lg">
                          {event.date.split(',')[0].split(' ')[1]}
                        </span>
                      </div>
                      <div className={`mt-2 md:mt-0 ${index % 2 === 0 ? 'md:ml-4 md:mr-0' : 'md:mr-4 md:ml-0'}`}>
                        <p className="text-gold uppercase tracking-wider text-xs">{event.date.split(',')[0].split(' ')[0]}</p>
                        <p className="text-white font-serif text-2xl">{event.date.split(',')[1].trim()}</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-serif text-2xl md:text-3xl font-bold mb-3">
                    {event.title}
                  </h3>

                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2 md:justify-start">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 md:justify-start">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 md:justify-start">
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{event.price}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-start md:gap-4">
                    <span className={`px-4 py-1 text-xs uppercase tracking-wider font-bold rounded-full ${
                      event.status === 'Selling Fast' 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                        : event.status === 'Presale'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {event.status}
                    </span>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-2 bg-gold text-matte-black font-bold uppercase tracking-widest text-xs hover:bg-gold-light transition-colors duration-300"
                    >
                      Get Tickets
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.2 + 0.3 }}
                className="absolute left-6 md:left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gold rounded-full neon-border z-10"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
