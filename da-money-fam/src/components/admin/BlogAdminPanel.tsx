'use client'

import { useEffect, useState } from 'react'

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover_image_url: string | null
  is_published: boolean
  published_at: string
}

const empty = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  is_published: false,
}

export default function BlogAdminPanel() {
  const [posts, setPosts] = useState<Post[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/blog')
    const data = await res.json()
    setPosts(data.posts || [])
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const payload = {
      ...form,
      cover_image_url: form.cover_image_url || null,
      ...(editingId ? { id: editingId } : {}),
    }
    const res = await fetch('/api/admin/blog', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setMessage(data.error || 'Save failed')
      return
    }
    setMessage(editingId ? 'Updated' : 'Created')
    setForm(empty)
    setEditingId(null)
    load()
  }

  const edit = (post: Post) => {
    setEditingId(post.id)
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content: post.content || '',
      cover_image_url: post.cover_image_url || '',
      is_published: post.is_published,
    })
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="font-serif text-xl text-gold">{editingId ? 'Edit post' : 'New post'}</h3>
        {message && <p className="text-sm text-gold">{message}</p>}
        {(
          [
            ['title', 'Title'],
            ['slug', 'Slug'],
            ['excerpt', 'Excerpt'],
            ['cover_image_url', 'Cover image URL'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs uppercase tracking-wider text-gray-500">
            {label}
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
            />
          </label>
        ))}
        <label className="block text-xs uppercase tracking-wider text-gray-500">
          Content
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={10}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.is_published}
            onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
          />
          Published
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-5 py-2 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null)
                setForm(empty)
              }}
              className="px-5 py-2 rounded-full bg-white/10 text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {posts.length === 0 ? (
          <p className="text-gray-500 text-sm">No posts yet.</p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="glass rounded-xl p-4 flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{p.title}</p>
                <p className="text-[11px] text-gray-500">
                  /{p.slug} · {p.is_published ? 'Published' : 'Draft'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => edit(p)} className="text-xs px-3 py-1 rounded-full bg-white/10">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
