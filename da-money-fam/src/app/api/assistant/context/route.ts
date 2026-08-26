import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getUserCoins } from '@/lib/user-store'
import { listAdStudioGenerations } from '@/lib/ad-studio-jobs'
import { getLatestPost } from '@/lib/blog/posts'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  const latest = await getLatestPost().catch(() => null)
  const latestBlog = latest ? { slug: latest.slug, title: latest.title } : null

  if (!user) {
    return NextResponse.json({
      signedIn: false,
      coins: null,
      lastVideos: [],
      lastImages: [],
      latestBlog,
    })
  }

  const coins = await getUserCoins(user.id).catch(() => 0)
  const gens = await listAdStudioGenerations(user.id).catch(() => [])
  const lastVideos = gens.slice(0, 5).map((g) => ({
    id: g.id,
    brief: (g.brief || g.scenes?.[0]?.brief || 'Untitled').slice(0, 160),
    thumb: g.thumbnail_url,
    url: g.video_urls?.[0] || null,
    mode: g.mode,
  }))

  let lastImages: Array<{ id: string; url: string; prompt: string }> = []
  const supabase = createServiceClient()
  if (supabase) {
    const { data } = await supabase
      .from('ad_studio_images')
      .select('id,output_url,prompt')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    lastImages = (data || []).map((row: { id?: string; output_url?: string; prompt?: string }) => ({
      id: String(row.id || ''),
      url: String(row.output_url || ''),
      prompt: String(row.prompt || '').slice(0, 120),
    }))
  }

  return NextResponse.json({
    signedIn: true,
    coins,
    lastVideos,
    lastImages,
    latestBlog,
  })
}
