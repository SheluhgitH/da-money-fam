'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CONFIG } from '@/config'
import { scrollRevealInView } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthProvider'
import { canAccessPerk } from '@/lib/fan-perks'

const events = [
  {
    id: 1,
    title: 'World Tour Launch',
    date: 'February 15, 2026',
    isoDate: '2026-02-15T20:00:00',
    location: 'Madison Square Garden, NYC',
    time: '8:00 PM',
    price: '$150 - $500',
    status: 'Selling Fast',
  },
  {
    id: 2,
    title: 'Luxury Fest 2026',
    date: 'March 20, 2026',
    isoDate: '2026-03-20T19:00:00',
    location: 'LA Live, Los Angeles',
    time: '7:00 PM',
    price: '$100 - $400',
    status: 'Available',
  },
  {
    id: 3,
    title: 'Exclusive Album Release',
    date: 'April 5, 2026',
    isoDate: '2026-04-05T21:00:00',
    location: 'The Forum, Inglewood',
    time: '9:00 PM',
    price: '$200 - $600',
    status: 'Presale',
  },
]

function DropCountdown({ targetIso, title }: { targetIso: string; title: string }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now()
      if (diff <= 0) {
        setLabel('Dropping soon')
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const mins = Math.floor((diff / (1000 * 60)) % 60)
      setLabel(`${days}d ${hours}h ${mins}m`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [targetIso])

  if (!label) return null
  return (
    <div className="mb-8 md:mb-12 glass-gold rounded-2xl border border-gold/30 px-6 py-5 text-center">
      <p className="text-gold text-[10px] font-bold uppercase tracking-[0.35em] mb-2">Latest Drop Countdown</p>
      <p className="font-serif text-2xl md:text-3xl text-white">{title}</p>
      <p className="text-gold font-mono text-lg mt-2">{label}</p>
    </div>
  )
}

function PresaleWaitlist({ eventTitle }: { eventTitle: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: `event-presale:${eventTitle}`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      setStatus('done')
      setMessage("You're on the list. We'll email you when tickets open.")
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Signup failed')
    }
  }

  if (status === 'done') {
    return <p className="text-green-400 text-xs mt-3">{message}</p>
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for waitlist"
        className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-xs text-white"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-4 py-2 bg-gold text-black text-[10px] font-bold uppercase tracking-wider rounded-full disabled:opacity-50"
      >
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </button>
      {status === 'error' && <p className="text-red-400 text-[10px] sm:col-span-2">{message}</p>}
    </form>
  )
}

export default function EventCalendar() {
  const headerRef = useRef(null)
  const isInView = useInView(headerRef, scrollRevealInView)
  const { user } = useAuth()
  const [level, setLevel] = useState(1)
  const [fanClub, setFanClub] = useState(false)

  useEffect(() => {
    if (!user) {
      setLevel(1)
      setFanClub(false)
      return
    }
    fetch('/api/user/entitlements')
      .then((r) => r.json())
      .then((data) => {
        setLevel(Number(data.level) || 1)
        setFanClub(Boolean(data.fan_club))
      })
      .catch(() => {})
  }, [user])

  const hasPresale = canAccessPerk(level, fanClub, 'presale')

  const getTicketUrl = (event: (typeof events)[0]) =>
    `mailto:${CONFIG.CONTACT_EMAIL}?subject=${encodeURIComponent(`Tickets: ${event.title}`)}&body=${encodeURIComponent(
      `Hi Da Money Fam,\n\nI'd like tickets for:\n\nEvent: ${event.title}\nDate: ${event.date}\nLocation: ${event.location}\nTime: ${event.time}\nPrice range: ${event.price}\n\nThanks!`
    )}`

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section id="events" className="max-w-7xl mx-auto scroll-skew">
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
          Upcoming Events
        </motion.h2>
        <motion.p variants={itemVariants} className="text-gray-400 text-sm sm:text-base md:text-lg">
          Experience Da Money Fam live
        </motion.p>
      </motion.div>

      <DropCountdown targetIso={events[0].isoDate} title={events[0].title} />

      <motion.div
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={containerVariants}
        className="relative"
      >
        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold via-gold-dark to-transparent" />

        <div className="space-y-6 md:space-y-12">
          {events.map((event, index) => {
            const isPresale = event.status === 'Presale'
            return (
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
                  <div className="glass rounded-2xl p-4 sm:p-6 md:p-8 transition-all duration-500 hover:border-gold/50 hover:neon-border bg-black/30 backdrop-blur-md border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4 mb-4 md:justify-start">
                      <div
                        className={`flex flex-col items-center md:flex-row ${
                          index % 2 === 0 ? 'md:flex-row-reverse' : ''
                        }`}
                      >
                        <div className="w-16 h-16 bg-gradient-to-br from-gold to-gold-dark rounded-xl flex items-center justify-center neon-border">
                          <span className="text-black font-serif font-bold text-lg">
                            {event.date.split(',')[0].split(' ')[1]}
                          </span>
                        </div>
                        <div
                          className={`mt-2 md:mt-0 ${
                            index % 2 === 0 ? 'md:ml-4 md:mr-0' : 'md:mr-4 md:ml-0'
                          }`}
                        >
                          <p className="text-gold uppercase tracking-wider text-xs">
                            {event.date.split(',')[0].split(' ')[0]}
                          </p>
                          <p className="text-white font-serif text-2xl">
                            {event.date.split(',')[1].trim()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-serif text-2xl md:text-3xl font-bold mb-3">{event.title}</h3>

                    <div className="space-y-2 text-gray-400 mb-6">
                      <p>{event.location}</p>
                      <p>{event.time}</p>
                      <p>{event.price}</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between md:justify-start md:gap-4">
                        <span
                          className={`px-4 py-1 text-xs uppercase tracking-wider font-bold rounded-full ${
                            event.status === 'Selling Fast'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : event.status === 'Presale'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}
                        >
                          {event.status}
                        </span>

                        {!isPresale && (
                          <motion.a
                            href={getTicketUrl(event)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-2 bg-gold text-matte-black font-bold uppercase tracking-widest text-xs hover:bg-gold-light transition-colors duration-300 inline-block"
                          >
                            Get Tickets
                          </motion.a>
                        )}
                      </div>

                      {isPresale &&
                        (hasPresale ? (
                          <div>
                            <p className="text-gold text-[10px] uppercase tracking-wider font-bold mb-1">
                              Presale unlocked — join the waitlist
                            </p>
                            <PresaleWaitlist eventTitle={event.title} />
                          </div>
                        ) : (
                          <div className="text-left md:text-inherit">
                            <p className="text-zinc-400 text-xs mb-2">
                              Presale waitlist unlocks with Fan Club or Level 5.
                            </p>
                            <Link
                              href="/#reputation"
                              className="inline-block px-5 py-2 border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-gold/10"
                            >
                              Unlock Presale
                            </Link>
                          </div>
                        ))}
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
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
