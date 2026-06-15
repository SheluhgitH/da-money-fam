'use client'

import { useState } from 'react'

export default function NewSongForm({ onCreated }: { onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const form = e.currentTarget
      const formData = new FormData(form)

      const res = await fetch('/api/admin/songs', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create song')

      form.reset()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create song')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4 max-w-2xl">
      <h2 className="font-serif text-2xl text-white mb-4">Add New Song</h2>

      <input name="title" required placeholder="Song title" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />
      <input name="artist" defaultValue="JackPot" placeholder="Artist" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />
      <input name="price" type="number" step="0.01" defaultValue="5.00" placeholder="Price" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />
      <input name="genre" placeholder="Genre" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />
      <input name="release_date" type="date" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />
      <textarea name="description" placeholder="Description" rows={3} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3" />

      <div>
        <label className="text-sm text-gray-400 block mb-2">MP3 / Audio File</label>
        <input name="mp3" type="file" accept="audio/*" required className="w-full text-sm" />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Album Cover</label>
        <input name="cover" type="file" accept="image/*" required className="w-full text-sm" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input name="for_sale" type="checkbox" value="true" defaultChecked />
        Available for purchase
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input name="is_promoted" type="checkbox" value="true" defaultChecked />
        Promote on homepage
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input name="is_published" type="checkbox" value="true" defaultChecked />
        Publish immediately
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-gold text-black font-bold px-6 py-3 rounded-full uppercase tracking-wider disabled:opacity-50"
      >
        {loading ? 'Uploading...' : 'Publish Song'}
      </button>
    </form>
  )
}
