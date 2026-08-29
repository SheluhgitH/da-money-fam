import type { MetadataRoute } from 'next'
import { getPublishedPosts } from '@/lib/blog/posts'
import { groupCatalogArtists, slugifyArtistName } from '@/lib/artist-catalog'
import { getAllSongs, getPublishedSongs, toPublicSong } from '@/lib/store'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://damoneyfam.com').replace(/\/$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/ad-studio`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/wallpapers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${siteUrl}/coin-wallet`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await getPublishedPosts()
    blogRoutes = posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.published_at || post.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    /* ignore */
  }

  let songRoutes: MetadataRoute.Sitemap = []
  try {
    const songs = await getAllSongs()
    songRoutes = songs
      .filter((s) => s.for_sale || s.id)
      .slice(0, 100)
      .map((song) => ({
        url: `${siteUrl}/?song=${encodeURIComponent(song.id)}#store`,
        lastModified: song.created_at ? new Date(song.created_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
  } catch {
    /* ignore */
  }

  let artistRoutes: MetadataRoute.Sitemap = []
  try {
    const published = await getPublishedSongs()
    const artists = groupCatalogArtists(published.map((s) => toPublicSong(s)))
    artistRoutes = artists.map((artist) => ({
      url: `${siteUrl}/artist/${slugifyArtistName(artist.name)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }))
  } catch {
    /* ignore */
  }

  return [...staticRoutes, ...blogRoutes, ...artistRoutes, ...songRoutes]
}
