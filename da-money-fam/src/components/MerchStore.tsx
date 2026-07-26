'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { MERCH_CATALOG, MERCH_SIZES, isMerchInPresale, type MerchSize } from '@/lib/merch'
import { scrollRevealViewport } from '@/lib/motion'
import { trackPurchase } from '@/lib/analytics'
import { useMiniCart } from '@/contexts/MiniCartContext'

type ClothingType = 't-shirt' | 'sweater'

interface Product {
  id: number
  name: string
  category: string
  type: ClothingType
  image: string
  price: string
  rotate: number
  top: string
  left: string
}

const products: Product[] = [
  {
    id: 1,
    name: MERCH_CATALOG['1'].name,
    category: MERCH_CATALOG['1'].category,
    type: 't-shirt',
    image: '/store/merch/custom-dmf-t-shirt.png',
    price: `$${MERCH_CATALOG['1'].price.toFixed(2)}`,
    rotate: -6,
    top: '14%',
    left: '12%',
  },
  {
    id: 2,
    name: MERCH_CATALOG['2'].name,
    category: MERCH_CATALOG['2'].category,
    type: 'sweater',
    image: '/store/merch/dmf-sweater-1.png',
    price: `$${MERCH_CATALOG['2'].price.toFixed(2)}`,
    rotate: 8,
    top: '12%',
    left: '58%',
  },
  {
    id: 3,
    name: MERCH_CATALOG['3'].name,
    category: MERCH_CATALOG['3'].category,
    type: 'sweater',
    image: '/store/merch/dmf-sweater-2.png',
    price: `$${MERCH_CATALOG['3'].price.toFixed(2)}`,
    rotate: -10,
    top: '52%',
    left: '34%',
  },
]

function useMerchCheckout() {
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  const startCheckout = async (productId: number, size: MerchSize) => {
    setCheckingOutId(productId)
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout/merch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merch_id: String(productId), size }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Checkout failed')
      }
      window.location.href = data.url
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed')
      setCheckingOutId(null)
    }
  }

  return { checkingOutId, checkoutError, startCheckout }
}

function SizeSelector({
  selected,
  onSelect,
  disabled,
}: {
  selected: MerchSize
  onSelect: (size: MerchSize) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
      {MERCH_SIZES.map((size) => (
        <button
          key={size}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(size)}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors ${
            selected === size
              ? 'bg-gold text-black border-gold'
              : 'bg-black/50 text-white/70 border-white/20 hover:border-gold/50'
          } disabled:opacity-50`}
        >
          {size}
        </button>
      ))}
    </div>
  )
}

const FloatingProduct = ({
  product,
  onBuy,
  onQuickAdd,
  checkingOut,
}: {
  product: Product
  onBuy: (id: number, size: MerchSize) => void
  onQuickAdd?: (id: number, size: MerchSize) => void
  checkingOut: boolean
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [size, setSize] = useState<MerchSize>('M')
  const catalogItem = MERCH_CATALOG[String(product.id)]
  const inPresale = catalogItem ? isMerchInPresale(catalogItem) : false

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x)
  const mouseYSpring = useSpring(y)

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['15deg', '-15deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-15deg', '15deg'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    setIsHovered(false)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        top: product.top,
        left: product.left,
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
        transformStyle: 'preserve-3d',
      }}
      initial={{ y: 0 }}
      animate={{
        y: [0, -12, 0],
        rotate: [product.rotate, product.rotate + 1.5, product.rotate],
      }}
      transition={{
        y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="absolute z-10 cursor-pointer group"
    >
      <div className="block relative text-left">
        <div className="absolute -inset-4 bg-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative w-64 md:w-80 aspect-[3/4] rounded-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-gold/50">
          <Image
            src={product.image}
            alt={product.name}
            width={256}
            height={341}
            className="w-full h-full object-contain transition-transform duration-700 opacity-100 group-hover:scale-100"
          />

          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <span className="text-gold text-[10px] font-bold tracking-[3px] uppercase mb-1">
              {product.category} · 1-of-1
              {inPresale ? ' · Presale' : ''}
            </span>
            <h3 className="text-white text-xl font-bold mb-1">{product.name}</h3>
            <p className="text-gold/80 font-mono text-lg">{product.price}</p>
            {inPresale && (
              <p className="text-purple-200 text-[10px] uppercase tracking-wider mb-1">
                Fan Club / Level 5 early buy
              </p>
            )}
            <SizeSelector selected={size} onSelect={setSize} disabled={checkingOut} />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onQuickAdd?.(product.id, size)}
                disabled={checkingOut}
                className="flex-1 py-2 border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-gold/10 transition-colors disabled:opacity-60"
              >
                + Bag
              </button>
              <button
                type="button"
                onClick={() => onBuy(product.id, size)}
                disabled={checkingOut}
                className="flex-1 py-2 bg-gold text-black text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-white transition-colors disabled:opacity-60"
              >
                {checkingOut ? 'Redirecting...' : 'Buy Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MobileProductCard({
  product,
  onBuy,
  onQuickAdd,
  checkingOut,
}: {
  product: Product
  onBuy: (id: number, size: MerchSize) => void
  onQuickAdd?: (id: number, size: MerchSize) => void
  checkingOut: boolean
}) {
  const [size, setSize] = useState<MerchSize>('M')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={scrollRevealViewport}
      className="relative group"
    >
      <div className="block w-full aspect-[3/4]">
        <Image
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain"
          width={300}
          height={400}
        />
        <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
          <span className="text-gold text-[8px] font-bold tracking-[2px] uppercase">
            {product.category} · Limited run
          </span>
          <h3 className="text-white text-lg font-bold">{product.name}</h3>
          <p className="text-gold font-mono">{product.price}</p>
          <SizeSelector selected={size} onSelect={setSize} disabled={checkingOut} />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onQuickAdd?.(product.id, size)}
              disabled={checkingOut}
              className="flex-1 py-2 border border-gold/40 text-gold text-[10px] font-bold uppercase tracking-wider rounded-full disabled:opacity-60"
            >
              + Bag
            </button>
            <button
              type="button"
              onClick={() => onBuy(product.id, size)}
              disabled={checkingOut}
              className="flex-1 py-2 bg-gold text-black text-[10px] font-bold uppercase tracking-wider rounded-full disabled:opacity-60"
            >
              {checkingOut ? 'Redirecting...' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MerchStore() {
  const { checkingOutId, checkoutError, startCheckout } = useMerchCheckout()
  const { addItem } = useMiniCart()
  const [showSuccess, setShowSuccess] = useState(false)
  const tShirtPrice = MERCH_CATALOG['1'].price
  const sweaterPrice = MERCH_CATALOG['2'].price

  const quickAdd = (productId: number, size: MerchSize) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    addItem({
      id: `merch-${productId}-${size}`,
      kind: 'merch',
      title: product.name,
      priceLabel: product.price,
      image: product.image,
      size,
      merchId: productId,
    })
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('checkout') === 'success') {
      setShowSuccess(true)
      const sessionId = params.get('session_id')
      if (sessionId) {
        fetch(`/api/checkout/verify-merch?session_id=${encodeURIComponent(sessionId)}`)
          .then(async (res) => {
            const data = await res.json()
            if (res.ok && data.analytics) {
              trackPurchase(data.analytics)
            }
          })
          .catch(() => {})
      }
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('from')
      url.searchParams.delete('session_id')
      const query = url.searchParams.toString()
      const hash = url.hash || '#merch'
      window.history.replaceState({}, '', `${url.pathname}${query ? `?${query}` : ''}${hash}`)
    }
  }, [])

  return (
    <section id="merch" className="relative min-h-0 md:min-h-[100dvh] lg:h-[120vh] w-full bg-matte-black py-12 md:py-24 pb-20 md:pb-32">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_70%)]" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
      </div>

      <div className="container mx-auto px-4 h-full relative">
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 md:p-6 glass-gold rounded-2xl border border-gold/40 text-center relative z-30"
          >
            <p className="text-gold text-2xl mb-2">✓</p>
            <h3 className="font-serif text-xl text-white mb-2">Order Confirmed</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Thanks for your purchase. A confirmation email is on the way with shipping details.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/#store"
                className="inline-block border border-gold/40 text-gold font-bold px-6 py-2 rounded-full uppercase tracking-wider text-[10px] hover:bg-gold hover:text-black transition-colors"
              >
                Shop Music
              </Link>
              <Link
                href="/#reputation"
                className="inline-block border border-gold/40 text-gold font-bold px-6 py-2 rounded-full uppercase tracking-wider text-[10px] hover:bg-gold hover:text-black transition-colors"
              >
                Join Fan Club
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="mt-4 text-xs text-gold hover:text-white uppercase tracking-wider"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        <div className="flex flex-col items-center text-center z-20 relative">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollRevealViewport}
            className="text-gold font-bold tracking-[5px] uppercase text-sm mb-4"
          >
            Exclusive Collection
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollRevealViewport}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-serif text-white mb-4 md:mb-6 uppercase tracking-tighter"
          >
            Luxury <span className="text-gold italic">Merchandise</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollRevealViewport}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-white/50 text-sm sm:text-base md:text-lg leading-relaxed mb-8 md:mb-12 px-2"
          >
            Hand-crafted 1-of-1 DMF pieces — limited custom runs only. T-shirts from $
            {tShirtPrice.toFixed(2)}, sweaters from ${sweaterPrice.toFixed(2)}. Select your size before checkout.
          </motion.p>
          {checkoutError && (
            <p className="text-red-400 text-sm mb-4 max-w-md">{checkoutError}</p>
          )}
        </div>

        <div className="absolute inset-0 mt-32 md:block hidden">
          {products.map((product) => (
            <FloatingProduct
              key={product.id}
              product={product}
              onBuy={startCheckout}
              onQuickAdd={quickAdd}
              checkingOut={checkingOutId === product.id}
            />
          ))}
        </div>

        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
          {products.map((product) => (
            <MobileProductCard
              key={product.id}
              product={product}
              onBuy={startCheckout}
              onQuickAdd={quickAdd}
              checkingOut={checkingOutId === product.id}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </section>
  )
}
