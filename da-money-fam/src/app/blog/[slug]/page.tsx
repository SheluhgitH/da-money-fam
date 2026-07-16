import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BlogShareButtons from '@/components/blog/BlogShareButtons'
import RelatedPosts from '@/components/blog/RelatedPosts'
import { getPostBySlug, getRelatedPosts } from '@/lib/blog/posts'
import { getReadingTimeMinutes } from '@/lib/blog/shared'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
  if (!post) return { title: 'Post Not Found | DMF Blog' }
  return {
    title: `${post.title} | DMF Blog`,
    description: post.excerpt,
  }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)
  if (!post) notFound()

  const related = await getRelatedPosts(params.slug)
  const paragraphs = post.content.split(/\n\n+/).filter(Boolean)
  const readingTime = getReadingTimeMinutes(post.content)

  return (
    <main className="min-h-screen bg-matte-black">
      <Navigation />

      <article className="pt-24 pb-16">
        {post.cover_image_url && (
          <div className="relative w-full h-64 md:h-96 mb-10">
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-matte-black via-matte-black/40 to-transparent" />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <span className="text-gold text-[10px] uppercase tracking-[4px]">DMF Editorial</span>
          <h1 className="font-serif text-3xl md:text-5xl gold-gradient mt-3 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {formatDate(post.published_at)} · {readingTime} min read
          </p>

          <BlogShareButtons title={post.title} slug={post.slug} />

          <div className="space-y-5 text-gray-300 text-base md:text-lg leading-relaxed mt-10">
            {paragraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <RelatedPosts posts={related} />

          <Link
            href="/blog"
            className="inline-block mt-12 text-gold text-sm uppercase tracking-widest hover:text-white transition-colors"
          >
            ← Back to Blog
          </Link>
        </div>
      </article>

      <Footer />
    </main>
  )
}
