import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { getSongComments, addSongComment, deleteSongComment, awardXp, getUserStats } from '@/lib/user-store'
import { getSongById } from '@/lib/store'
import { isActiveFanClubMember } from '@/lib/fan-club'
import { canAccessPerk, levelFromXp } from '@/lib/fan-perks'
import type { SongComment } from '@/types/store'

export const dynamic = 'force-dynamic'

const PRIORITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

async function enrichComments(comments: SongComment[]): Promise<SongComment[]> {
  const enriched = await Promise.all(
    comments.map(async (c) => {
      try {
        const stats = await getUserStats(c.user_id)
        const fanClub = await isActiveFanClubMember(c.user_id)
        const level = levelFromXp(stats.xp)
        const priority =
          canAccessPerk(level, fanClub, 'priority_comments') &&
          Date.now() - new Date(c.created_at).getTime() < PRIORITY_WINDOW_MS
        return { ...c, level, fan_club: fanClub, priority }
      } catch {
        return { ...c, level: 1, fan_club: false, priority: false }
      }
    })
  )

  return enriched.sort((a, b) => {
    if (a.priority && !b.priority) return -1
    if (!a.priority && b.priority) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('song_id')
    if (!songId) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const comments = await getSongComments(songId)
    const enriched = await enrichComments(comments)
    return NextResponse.json({ comments: enriched })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load comments' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { song_id, comment_text } = await req.json()
    if (!song_id || !comment_text) {
      return NextResponse.json({ error: 'song_id and comment_text are required' }, { status: 400 })
    }

    const song = await getSongById(song_id)
    if (!song || !song.is_published) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    const comment = await addSongComment(user.id, song_id, comment_text)
    await awardXp(user.id, 200)

    const stats = await getUserStats(user.id)
    const fanClub = await isActiveFanClubMember(user.id)
    const level = levelFromXp(stats.xp)
    const priority = canAccessPerk(level, fanClub, 'priority_comments')

    return NextResponse.json({
      comment: { ...comment, level, fan_club: fanClub, priority },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add comment' },
      { status: 400 }
    )
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const commentId = searchParams.get('comment_id')
    if (!commentId) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    await deleteSongComment(user.id, commentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete comment' },
      { status: 400 }
    )
  }
}
