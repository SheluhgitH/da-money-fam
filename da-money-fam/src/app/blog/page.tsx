import Link from 'next/link'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { getPublishedPosts } from '@/lib/blog/posts'
import { getReadingTimeMinutes } from '@/lib/blog/shared'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()
  const [featured, ...rest] = posts

  return (
    <main className="min-h-screen bg-matte-black">
      <Navigation />

      <div className="pt-28 pb-16 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <div className="text-center mb-12 md:mb-16">
          <span className="text-gold text-[10px] sm:text-xs font-bold tracking-[5px] uppercase">
            Culture &amp; Commentary
          </span>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold mt-4 gold-gradient">
            The DMF Blog
          </h1>
          <p className="text-gray-400 text-sm md:text-lg mt-4 max-w-2xl mx-auto">
            Daily drops on luxury hip-hop, fashion, and culture from Da Money Fam.
          </p>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-gray-500 py-20">No posts yet. Check back soon.</p>
        ) : (
          <>
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block mb-12 rounded-2xl border border-gold/20 bg-black/50 backdrop-blur-sm overflow-hidden hover:border-gold/50 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)] transition-all duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="relative h-64 lg:h-80 bg-zinc-900">
                    {featured.cover_image_url ? (
                      <Image
                        src={featured.cover_image_url}
                        alt={featured.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-black flex items-center justify-center text-5xl">
                        ✦
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute top-4 left-4 px-3 py-1 text-[10px] uppercase tracking-widest bg-gold text-black font-bold rounded-full">
                      Featured
                    </span>
                  </div>
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <span className="text-gold text-[10px] uppercase tracking-[3px]">DMF Editorial</span>
                    <h2 className="font-serif text-2xl md:text-4xl text-white mt-3 mb-4 group-hover:text-gold transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-gray-400 text-base line-clamp-4">{featured.excerpt}</p>
                    <p className="text-gray-600 text-xs mt-6 uppercase tracking-wider">
                      {formatDate(featured.published_at)} · {getReadingTimeMinutes(featured.content)} min read
                    </p>
                    <span className="inline-block mt-6 text-gold text-sm uppercase tracking-widest group-hover:text-white transition-colors">
                      Read now →
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group block rounded-2xl border border-white/10 bg-black/50 backdrop-blur-sm overflow-hidden hover:border-gold/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.08)] transition-all duration-300"
                  >
                    <div className="relative h-48 w-full bg-zinc-900">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                    <div className="p-6">
                      <span className="text-gold text-[10px] uppercase tracking-[3px]">DMF Editorial</span>
                      <h2 className="font-serif text-xl text-white mt-2 mb-2 group-hover:text-gold transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-gray-500 text-sm line-clamp-3">{post.excerpt}</p>
                      <p className="text-gray-600 text-xs mt-4 uppercase tracking-wider">
                        {formatDate(post.published_at)} · {getReadingTimeMinutes(post.content)} min read
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </main>
  )
}
