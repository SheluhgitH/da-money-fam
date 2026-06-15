'use client'

import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useRef } from 'react'
import { CONFIG } from '@/config'
import { scrollRevealViewport } from '@/lib/motion'

type ClothingType = 't-shirt' | 'sweater' | 'hoodie' | 'jeans'

const MERCH_PRICES: Record<ClothingType, number> = {
  't-shirt': 75,
  sweater: 120,
  hoodie: 175,
  jeans: 150,
}

function formatPrice(amount: number) {
  return `$${amount.toFixed(2)}`
}

function merchInquiryUrl() {
  return 'https://checkout.stripe.com/c/pay/cs_live_a1fBCMfT05xPb71sCnwnGQNOTP553I3vh8J6ja1Qtwqx1XVovN6TWDGXkS#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdicGRmZGhqaWBTZHdsZGtxJz8nZmprcXdqaScpJ2R1bE5gfCc%2FJ3VuWmlsc2BaMDRWcXI9SENHVmNVNURxPGd3d3V2QEhgTzdPcDA9f2R9aVF%2Fc2JzdU9wVnEzREJQPUlpM1xTaEdEajE8aG98MzM8NUNtUTVdRnVsUnJfVHBEYTVtUVxOb2Q1NWJSVklKTENsJyknY3dqaFZgd3Ngdyc%2FcXdwYCknZ2RmbmJ3anBrYUZqaWp3Jz8nJmNjY2NjYycpJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl'
}

interface Product {
  id: number
  name: string
  category: string
  type: ClothingType
  image: string
  price: string
  link: string
  rotate: number
  top: string
  left: string
}

const products: Product[] = [
  {
    id: 1,
    name: 'Custom 1of1 DMF T-Shirt',
    category: 'T-SHIRT',
    type: 't-shirt',
    image: '/store/merch/custom-dmf-t-shirt.png',
    price: formatPrice(MERCH_PRICES['t-shirt']),
    link: merchInquiryUrl(),
    rotate: -6,
    top: '14%',
    left: '12%',
  },
  {
    id: 2,
    name: 'DMF 1of1 Sweater — Style 1',
    category: 'SWEATER',
    type: 'sweater',
    image: '/store/merch/dmf-sweater-1.png',
    price: formatPrice(MERCH_PRICES.sweater),
    link: merchInquiryUrl(),
    rotate: 8,
    top: '12%',
    left: '58%',
  },
  {
    id: 3,
    name: 'DMF 1of1 Sweater — Style 2',
    category: 'SWEATER',
    type: 'sweater',
    image: '/store/merch/dmf-sweater-2.png',
    price: formatPrice(MERCH_PRICES.sweater),
    link: merchInquiryUrl(),
    rotate: -10,
    top: '52%',
    left: '34%',
  },
]

const FloatingProduct = ({ product }: { product: Product }) => {
    const ref = useRef<HTMLDivElement>(null)
    const [isHovered, setIsHovered] = useState(false)

    // Parallel 3D effect on hover
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const mouseXSpring = useSpring(x)
    const mouseYSpring = useSpring(y)

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"])
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"])

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
                transformStyle: "preserve-3d",
            }}
            initial={{ y: 0 }}
            animate={{
                y: [0, -12, 0],
                rotate: [product.rotate, product.rotate + 1.5, product.rotate]
            }}
            transition={{
                y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute z-10 cursor-pointer group"
        >
            <a href={product.link} target="_blank" rel="noopener noreferrer" className="block relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Product Card */}
                <div className="relative w-64 md:w-80 aspect-[3/4] rounded-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-gold/50">
                        <Image
                            src={product.image}
                            alt={product.name}
                            width={256} // w-64, aspect-[3/4] -> 256 / 3 * 4 = 341.33
                            height={341}
                            className="w-full h-full object-contain transition-transform duration-700 opacity-100 group-hover:scale-100"
                        />

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                        <span className="text-gold text-[10px] font-bold tracking-[3px] uppercase mb-1">{product.category}</span>
                        <h3 className="text-white text-xl font-bold mb-1">{product.name}</h3>
                        <p className="text-gold/80 font-mono text-lg">{product.price}</p>
                    </div>

                </div>
            </a>
        </motion.div>
    )
}

export default function MerchStore() {
    return (
        <section id="merch" className="relative min-h-0 md:min-h-[100dvh] lg:h-[120vh] w-full bg-matte-black py-12 md:py-24 pb-20 md:pb-32">
            {/* Background Texture/Particles */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_70%)]" />
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            </div>

            <div className="container mx-auto px-4 h-full relative">
                {/* Title Section */}
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
                        Hand-crafted 1-of-1 DMF pieces. T-shirts from {formatPrice(MERCH_PRICES['t-shirt'])}, sweaters from {formatPrice(MERCH_PRICES.sweater)} — each piece is unique.
                    </motion.p>
                </div>

                {/* Floating Products Container */}
                <div className="absolute inset-0 mt-32 md:block hidden">
                    {products.map((product) => (
                        <FloatingProduct key={product.id} product={product} />
                    ))}
                </div>

                {/* Mobile Grid Layout (since floating absolute doesn't work well on mobile) */}
                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12">
                    {products.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={scrollRevealViewport}
                            className="relative group"
                        >
                            <a href={product.link} className="block aspect-[3/4]">
                                <Image src={product.image} alt={product.name} className="w-full h-full object-contain" width={300} height={400} />
                                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                    <span className="text-gold text-[8px] font-bold tracking-[2px] uppercase">{product.category}</span>
                                    <h3 className="text-white text-lg font-bold">{product.name}</h3>
                                    <p className="text-gold font-mono">{product.price}</p>
                                </div>
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </section>
    )
}
