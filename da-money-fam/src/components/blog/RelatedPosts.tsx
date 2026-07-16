import Link from 'next/link'
import Image from 'next/image'
import { getReadingTimeMinutes, type BlogPost } from '@/lib/blog/shared'

interface RelatedPostsProps {
  posts: BlogPost[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <section className="mt-16 pt-10 border-t border-white/10">
      <h2 className="font-serif text-2xl text-white mb-6 gold-gradient">More from DMF</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group block rounded-xl border border-white/10 bg-black/40 overflow-hidden hover:border-gold/40 transition-colors"
          >
            <div className="relative h-36 bg-zinc-900">
              {post.cover_image_url ? (
                <Image
                  src={post.cover_image_url}
                  alt={post.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-black flex items-center justify-center text-2xl">
                  ✦
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg text-white group-hover:text-gold transition-colors line-clamp-2">
                {post.title}
              </h3>
              <p className="text-gray-500 text-xs mt-2 uppercase tracking-wider">
                {formatDate(post.published_at)} · {getReadingTimeMinutes(post.content)} min read
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
