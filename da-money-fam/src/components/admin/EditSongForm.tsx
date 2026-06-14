'use client'

import { useState } from 'react'
import type { Song } from '@/types/store'

const inputClass =
  'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500'

interface EditSongFormProps {
  song: Song
  onSaved: () => void
  onCancel: () => void
}

export default function EditSongForm({ song, onSaved, onCancel }: EditSongFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPromoted, setIsPromoted] = useState(song.is_promoted)
  const [isPublished, setIsPublished] = useState(song.is_published)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('id', song.id)
      formData.set('is_promoted', isPromoted ? 'true' : 'false')
      formData.set('is_published', isPublished ? 'true' : 'false')

      const res = await fetch('/api/admin/songs', {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update song')

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update song')
    } finally {
      setLoading(false)
    }
  }

  const audioFileName = song.mp3_file_path.split('/').pop()

  return (
    <form onSubmit={handleSubmit} className="glass rounded-xl p-6 space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h2 className="font-serif text-2xl text-white">Edit Song</h2>
          <p className="text-gray-500 text-sm mt-1">Update metadata or replace audio / cover files</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <input
        name="title"
        required
        defaultValue={song.title}
        placeholder="Song title"
        className={inputClass}
      />
      <input
        name="artist"
        required
        defaultValue={song.artist}
        placeholder="Artist"
        className={inputClass}
      />
      <input
        name="price"
        type="number"
        step="0.01"
        required
        defaultValue={song.price}
        placeholder="Price"
        className={inputClass}
      />
      <input
        name="genre"
        defaultValue={song.genre || ''}
        placeholder="Genre"
        className={inputClass}
      />
      <input
        name="release_date"
        type="date"
        defaultValue={song.release_date || ''}
        className={inputClass}
      />
      <textarea
        name="description"
        defaultValue={song.description || ''}
        placeholder="Description"
        rows={3}
        className={inputClass}
      />

      <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg border border-white/10">
        <img
          src={song.album_cover_path}
          alt={song.title}
          className="w-20 h-20 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current cover</p>
          <p className="text-sm text-gray-300 truncate">{song.album_cover_path}</p>
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Replace album cover (optional)</label>
        <input name="cover" type="file" accept="image/*" className="w-full text-sm text-gray-300" />
      </div>

      <div className="p-4 bg-black/30 rounded-lg border border-white/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current audio</p>
        <p className="text-sm text-gray-300 truncate">{audioFileName}</p>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Replace audio file (optional)</label>
        <input name="mp3" type="file" accept="audio/*" className="w-full text-sm text-gray-300" />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={isPromoted}
          onChange={(e) => setIsPromoted(e.target.checked)}
        />
        Promote on homepage
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Published (visible in store)
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-gold text-black font-bold px-6 py-3 rounded-full uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <a
          href={`/api/preview/${song.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-full border border-white/20 text-sm text-gray-300 hover:text-white hover:border-gold/50 transition-colors"
        >
          Preview Audio
        </a>
      </div>
    </form>
  )
}
