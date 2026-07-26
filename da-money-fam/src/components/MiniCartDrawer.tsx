'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useMiniCart } from '@/contexts/MiniCartContext'

export default function MiniCartDrawer() {
  const { items, isOpen, closeCart, removeItem, clearCart } = useMiniCart()
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')

  const checkoutFirst = async () => {
    const item = items[0]
    if (!item) return
    setCheckingOut(true)
    setError('')
    try {
      if (item.kind === 'song' && item.songId) {
        const res = await fetch('/api/checkout/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: item.songId }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
        window.location.href = data.url
        return
      }
      if (item.kind === 'merch' && item.merchId != null && item.size) {
        const res = await fetch('/api/checkout/merch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merch_id: String(item.merchId), size: item.size }),
        })
        const data = await res.json()
        if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
        window.location.href = data.url
        return
      }
      throw new Error('Item is missing checkout details')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setCheckingOut(false)
    }
  }

  const checkoutAll = async () => {
    if (!items.length) return
    setCheckingOut(true)
    setError('')
    try {
      const res = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            kind: item.kind,
            songId: item.songId,
            merchId: item.merchId,
            size: item.size,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setCheckingOut(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-[121] w-full max-w-sm bg-matte-black border-l border-gold/20 p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl text-white">Your Bag</h3>
              <button type="button" onClick={closeCart} className="text-gray-400 hover:text-white text-xl">
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-gray-500 text-sm">Your bag is empty. Quick-add songs or merch to start.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {items.map((item) => (
                  <li key={item.id} className="glass rounded-xl p-3 flex gap-3 items-center">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-gold text-xs font-mono">
                        {item.priceLabel}
                        {item.size ? ` · ${item.size}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-gray-500 hover:text-red-400 text-xs uppercase"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

            <div className="mt-6 space-y-3">
              {items.length === 1 ? (
                <button
                  type="button"
                  disabled={!items.length || checkingOut}
                  onClick={checkoutAll}
                  className="w-full py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full disabled:opacity-50"
                >
                  {checkingOut ? 'Redirecting...' : 'Checkout'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!items.length || checkingOut}
                    onClick={checkoutAll}
                    className="w-full py-3 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-full disabled:opacity-50"
                  >
                    {checkingOut ? 'Redirecting...' : 'Buy All'}
                  </button>
                  <button
                    type="button"
                    disabled={!items.length || checkingOut}
                    onClick={checkoutFirst}
                    className="w-full py-3 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors disabled:opacity-50"
                  >
                    Checkout First Item
                  </button>
                </>
              )}
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full py-2 text-gray-500 text-xs uppercase tracking-wider hover:text-white"
                >
                  Clear bag
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
