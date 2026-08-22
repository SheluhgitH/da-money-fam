'use client'

import { useState } from 'react'
import type { Song } from '@/types/store'
import SongAiFields from '@/components/admin/SongAiFields'

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
  const [forSale, setForSale] = useState(song.for_sale !== false)
  const [title, setTitle] = useState(song.title)
  const [artist, setArtist] = useState(song.artist)
  const [description, setDescription] = useState(song.description || '')
  const [genre, setGenre] = useState(song.genre || '')
  const [imagePrompt, setImagePrompt] = useState('')
  const [albumCoverPath, setAlbumCoverPath] = useState('')
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)

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
      formData.set('for_sale', forSale ? 'true' : 'false')

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
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Song title"
        className={inputClass}
      />
      <input
        name="artist"
        required
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
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
        name="release_date"
        type="date"
        defaultValue={song.release_date || ''}
        className={inputClass}
      />

      <SongAiFields
        title={title}
        artist={artist}
        description={description}
        genre={genre}
        onDescriptionChange={setDescription}
        onGenreChange={setGenre}
        mp3Required={false}
        currentCoverUrl={song.album_cover_path}
        albumCoverPath={albumCoverPath}
        onAlbumCoverPathChange={setAlbumCoverPath}
        coverPreviewUrl={coverPreviewUrl}
        onCoverPreviewUrlChange={setCoverPreviewUrl}
        imagePrompt={imagePrompt}
        onImagePromptChange={setImagePrompt}
        mp3FileName={audioFileName || null}
      />

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={forSale}
          onChange={(e) => setForSale(e.target.checked)}
        />
        Available for purchase (uncheck for exclusive preview-only)
      </label>

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
