import type { Metadata } from 'next'
import { getSongById } from '@/lib/store'
import HomePage from '@/components/HomePage'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = {
  searchParams: Promise<{ song?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const songId = params.song
  if (!songId) return {}

  const song = await getSongById(songId)
  if (!song) return {}

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com'
  const imageUrl = song.album_cover_path.startsWith('http')
    ? song.album_cover_path
    : `${siteUrl}${song.album_cover_path}`

  const title = `${song.title} — ${song.artist}`
  const description = song.description || `Listen and buy ${song.title} by ${song.artist} on Da Money Fam`

  return {
    title: `${title} | Da Money Fam`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: song.title }],
      url: `${siteUrl}/?song=${songId}#store`,
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

export default function Page() {
  return <HomePage />
}
