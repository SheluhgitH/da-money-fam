import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/user'
import { addSongComment, deleteSongComment, getSongComments, awardXp } from '@/lib/user-store'
import { getSongById } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('song_id')
    if (!songId) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const comments = await getSongComments(songId)
    return NextResponse.json({ comments })
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
    return NextResponse.json({ comment })
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
