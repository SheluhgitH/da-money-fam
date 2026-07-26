'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const MESSAGES = [
  '12 fans joined the Fan Club today',
  'Just purchased: Custom DMF Tee',
  'Someone from Atlanta grabbed a track',
  'New stream drop watched 36 times',
  'Merch restock — limited sizes left',
]

export default function SocialProofTicker() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="overflow-hidden rounded-full glass-gold border border-gold/20 px-4 py-2 max-w-xl mx-auto mb-8">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center text-gold/90 text-[10px] sm:text-xs uppercase tracking-[0.2em]"
        >
          {MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
