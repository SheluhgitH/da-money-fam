'use client'

import { useEffect, useState } from 'react'
import type { SongComment } from '@/types/store'
import { useAuth } from '@/contexts/AuthProvider'
import UserAvatar from '@/components/UserAvatar'

type SongCommentsProps = {
  songId: string
  initialCount?: number
}

export default function SongComments({ songId, initialCount = 0 }: SongCommentsProps) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState<SongComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [count, setCount] = useState(initialCount)

  const [loaded, setLoaded] = useState(false)

  const loadComments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments?song_id=${encodeURIComponent(songId)}`)
      const data = await res.json()
      if (res.ok) {
        setComments(data.comments || [])
        setCount((data.comments || []).length)
        setLoaded(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (expanded && !loaded) {
      loadComments()
    }
  }, [expanded, songId, loaded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent('/#store')}`
      return
    }
    if (!commentText.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId, comment_text: commentText }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments((prev) => [data.comment, ...prev])
        setCount((prev) => prev + 1)
        setCommentText('')
      }
    } catch (error) {
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs uppercase tracking-wider text-gray-400 hover:text-gold transition-colors"
      >
        {expanded ? 'Hide' : 'Show'} Comments ({count})
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? 'Drop your thoughts...' : 'Sign in to comment'}
              maxLength={500}
              disabled={!user || submitting}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!user || submitting || !commentText.trim()}
              className="px-4 py-2 bg-gold text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              Post
            </button>
          </form>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-sm">Be the first to comment on this track.</p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 items-start">
                  <UserAvatar
                    avatarUrl={comment.avatar_url}
                    displayName={comment.display_name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gold font-semibold">
                      {comment.display_name || 'Fan'}
                    </p>
                    <p className="text-sm text-gray-300 break-words">{comment.comment_text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
