import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import ArtistMusicPageClient from '@/components/ArtistMusicPageClient'
import { PreviewPlayerProvider } from '@/contexts/PreviewPlayerContext'
import StickyPreviewBar from '@/components/store/StickyPreviewBar'
import { groupCatalogArtists, resolveArtistBySlug, slugifyArtistName } from '@/lib/artist-catalog'
import { getPublishedSongs, toPublicSong } from '@/lib/store'

export const revalidate = 60

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const songs = await getPublishedSongs()
    const publicSongs = songs.map((s) => toPublicSong(s))
    const artists = groupCatalogArtists(publicSongs)
    return artists.map((a) => ({ slug: slugifyArtistName(a.name) }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const songs = await getPublishedSongs()
  const publicSongs = songs.map((s) => toPublicSong(s))
  const artist = resolveArtistBySlug(slug, publicSongs)
  if (!artist) return { title: 'Artist not found | Da Money Fam' }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com').replace(/\/$/, '')
  const imageUrl = artist.photo.startsWith('http')
    ? artist.photo
    : `${siteUrl}${artist.photo}`
  const title = `${artist.name} — Da Money Fam`
  const description = `Listen and buy music by ${artist.name} on Da Money Fam. ${artist.songs.length} track${artist.songs.length === 1 ? '' : 's'}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: artist.name }],
      url: `${siteUrl}/artist/${slugifyArtistName(artist.name)}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ArtistPage({ params }: PageProps) {
  const { slug } = await params
  const songs = await getPublishedSongs()
  const publicSongs = songs.map((s) => toPublicSong(s))
  const artist = resolveArtistBySlug(slug, publicSongs)
  if (!artist) notFound()

  return (
    <PreviewPlayerProvider>
      <main className="min-h-screen bg-matte-black text-white">
        <Navigation />
        <div className="pt-24 md:pt-28">
          <div className="max-w-lg mx-auto px-4 mb-4">
            <Link href="/" className="text-gold text-[10px] uppercase tracking-[0.25em] hover:text-white">
              ← Da Money Fam
            </Link>
          </div>
          <ArtistMusicPageClient artist={artist} />
        </div>
        <Footer />
        <StickyPreviewBar />
      </main>
    </PreviewPlayerProvider>
  )
}
