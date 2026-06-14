'use client'

import Image from 'next/image'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useRef } from 'react'
import { CONFIG } from '@/config'

function merchInquiryUrl(productName: string, price: string) {
  return `mailto:${CONFIG.CONTACT_EMAIL}?subject=${encodeURIComponent(`Merch: ${productName}`)}&body=${encodeURIComponent(
    `Hi Da Money Fam,\n\nI'm interested in purchasing:\n\nItem: ${productName}\nPrice: ${price}\n\nPlease send availability and shipping details.\n\nThanks!`
  )}`
}

interface Product {
    id: number;
    name: string;
    category: string;
    image: string;
    price: string;
    link: string;
    rotate: number;
    top: string;
    left: string;
}

const products: Product[] = [
    {
        id: 1,
        name: "Custom DMF Spray Hoodie",
        category: "DMF APPAREL",
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop",
        price: "$120.00",
        link: merchInquiryUrl("Custom DMF Spray Hoodie", "$120.00"),
        rotate: -5,
        top: "10%",
        left: "15%"
    },
    {
        id: 2,
        name: "Bleached Luxury Sweater",
        category: "HAND-CRAFTED",
        image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop",
        price: "$185.00",
        link: merchInquiryUrl("Bleached Luxury Sweater", "$185.00"),
        rotate: 8,
        top: "15%",
        left: "65%"
    },
    {
        id: 3,
        name: "Custom Sprayed Jeans",
        category: "DESIGNER DENIM",
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop",
        price: "$250.00",
        link: merchInquiryUrl("Custom Sprayed Jeans", "$250.00"),
        rotate: -12,
        top: "55%",
        left: "35%"
    },
    {
        id: 4,
        name: "DMF Gold Chain Tee",
        category: "ESSENTIALS",
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop",
        price: "$85.00",
        link: merchInquiryUrl("DMF Gold Chain Tee", "$85.00"),
        rotate: 5,
        top: "60%",
        left: "75%"
    }
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
                y: [0, -20, 0],
                rotate: [product.rotate, product.rotate + 2, product.rotate]
            }}
            transition={{
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute z-10 cursor-pointer group"
        >
            <a href={product.link} target="_blank" rel="noopener noreferrer" className="block relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Product Card */}
                <div className="relative w-64 md:w-80 aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-gold/50">
                    <Image
                        src={product.image}
                        alt={product.name}
                        width={256} // w-64, aspect-[3/4] -> 256 / 3 * 4 = 341.33
                        height={341}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    />

                    {/* Content Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6">
                        <span className="text-gold text-[10px] font-bold tracking-[3px] uppercase mb-1">{product.category}</span>
                        <h3 className="text-white text-xl font-bold mb-1">{product.name}</h3>
                        <p className="text-gold/80 font-mono text-lg">{product.price}</p>
                    </div>

                    {/* Quick Buy Button Overlay */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"
                    >
                        <div className="bg-white text-black px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-gold transition-colors">
                            Purchase Now
                        </div>
                    </motion.div>
                </div>
            </a>
        </motion.div>
    )
}

export default function MerchStore() {
    return (
        <section id="merch" className="relative h-[120vh] w-full bg-matte-black overflow-hidden py-24">
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
                        viewport={{ once: true }}
                        className="text-gold font-bold tracking-[5px] uppercase text-sm mb-4"
                    >
                        Exclusive Collection
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-serif text-white mb-6 uppercase tracking-tighter"
                    >
                        Luxury <span className="text-gold italic">Merchandise</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="max-w-2xl text-white/50 text-lg leading-relaxed mb-12"
                    >
                        Hand-crafted, spray-painted, and bleached essentials. Each piece is a unique 1-of-1 masterpiece designed by The Money Family.
                    </motion.p>
                </div>

                {/* Floating Products Container */}
                <div className="absolute inset-0 mt-32 md:block hidden">
                    {products.map((product) => (
                        <FloatingProduct key={product.id} product={product} />
                    ))}
                </div>

                {/* Mobile Grid Layout (since floating absolute doesn't work well on mobile) */}
                <div className="md:hidden grid grid-cols-1 gap-8 mt-12">
                    {products.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <a href={product.link} className="block aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/40">
                                <Image src={product.image} alt={product.name} className="w-full h-full object-cover opacity-80" width={300} height={400} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black p-6 flex flex-col justify-end">
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
