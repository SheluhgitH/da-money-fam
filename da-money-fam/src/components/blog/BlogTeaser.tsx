'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface LatestPost {
  slug: string
  title: string
  excerpt: string
  cover_image_url: string | null
  published_at: string
  reading_time_minutes: number
}

export default function BlogTeaser() {
  const [post, setPost] = useState<LatestPost | null>(null)

  useEffect(() => {
    fetch('/api/blog/latest')
      .then((res) => res.json())
      .then((data) => setPost(data.post ?? null))
      .catch(() => setPost(null))
  }, [])

  if (!post) return null

  return (
    <section className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <span className="text-gold text-[10px] sm:text-xs font-bold tracking-[5px] uppercase">
            Latest from DMF Blog
          </span>
          <h2 className="font-serif text-2xl md:text-4xl font-bold mt-3 gold-gradient">
            Culture Drop
          </h2>
        </div>
        <Link
          href="/blog"
          className="text-gold text-sm uppercase tracking-widest hover:text-white transition-colors"
        >
          View all →
        </Link>
      </div>

      <Link
        href={`/blog/${post.slug}`}
        className="group block rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm overflow-hidden hover:border-gold/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] transition-all duration-300"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative h-56 md:h-72 bg-zinc-900">
            {post.cover_image_url ? (
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-black flex items-center justify-center text-4xl">
                ✦
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="p-6 md:p-10 flex flex-col justify-center">
            <span className="text-gold text-[10px] uppercase tracking-[3px]">DMF Editorial</span>
            <h3 className="font-serif text-2xl md:text-3xl text-white mt-3 mb-3 group-hover:text-gold transition-colors">
              {post.title}
            </h3>
            <p className="text-gray-400 text-sm md:text-base line-clamp-3">{post.excerpt}</p>
            <p className="text-gray-600 text-xs mt-4 uppercase tracking-wider">
              {post.reading_time_minutes} min read
            </p>
            <span className="inline-block mt-6 text-gold text-sm uppercase tracking-widest group-hover:text-white transition-colors">
              Read now →
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
