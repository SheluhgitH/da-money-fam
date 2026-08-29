'use client'

import { useEffect, useState } from 'react'
import SongAiFields from '@/components/admin/SongAiFields'
import PreviewRegionPicker from '@/components/admin/PreviewRegionPicker'
import ArtistShareUrlHint from '@/components/admin/ArtistShareUrlHint'

const inputClass =
  'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500'

export default function NewSongForm({ onCreated }: { onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('JackPot')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [albumCoverPath, setAlbumCoverPath] = useState('')
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [hasCoverFile, setHasCoverFile] = useState(false)
  const [hasMp3, setHasMp3] = useState(false)
  const [mp3ObjectUrl, setMp3ObjectUrl] = useState<string | null>(null)
  const [previewStartSec, setPreviewStartSec] = useState(0)
  const [trackDurationSec, setTrackDurationSec] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      if (mp3ObjectUrl) URL.revokeObjectURL(mp3ObjectUrl)
    }
  }, [mp3ObjectUrl])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('preview_start_sec', String(previewStartSec))
      if (trackDurationSec != null && trackDurationSec > 0) {
        formData.set('track_duration_sec', String(trackDurationSec))
      }

      if (!hasMp3 && !(formData.get('mp3') as File)?.size) {
        throw new Error('MP3 / audio file is required')
      }
      if (!albumCoverPath && !hasCoverFile) {
        throw new Error('Album cover is required — generate with AI or upload a file')
      }

      const res = await fetch('/api/admin/songs', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create song')

      form.reset()
      setTitle('')
      setArtist('JackPot')
      setDescription('')
      setGenre('')
      setImagePrompt('')
      setAlbumCoverPath('')
      setCoverPreviewUrl(null)
      setHasCoverFile(false)
      setHasMp3(false)
      if (mp3ObjectUrl) URL.revokeObjectURL(mp3ObjectUrl)
      setMp3ObjectUrl(null)
      setPreviewStartSec(0)
      setTrackDurationSec(null)
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
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
        placeholder="Artist"
        className={inputClass}
      />
      <ArtistShareUrlHint artistName={artist} />
      <input
        name="price"
        type="number"
        step="0.01"
        defaultValue="5.00"
        placeholder="Price"
        className={inputClass}
      />
      <input name="release_date" type="date" className={inputClass} />

      <SongAiFields
        title={title}
        artist={artist}
        description={description}
        genre={genre}
        onDescriptionChange={setDescription}
        onGenreChange={setGenre}
        mp3Required
        albumCoverPath={albumCoverPath}
        onAlbumCoverPathChange={setAlbumCoverPath}
        coverPreviewUrl={coverPreviewUrl}
        onCoverPreviewUrlChange={setCoverPreviewUrl}
        imagePrompt={imagePrompt}
        onImagePromptChange={setImagePrompt}
        onCoverFileChange={(file) => setHasCoverFile(Boolean(file))}
        onMp3FileChange={(file) => {
          setHasMp3(Boolean(file))
          if (mp3ObjectUrl) URL.revokeObjectURL(mp3ObjectUrl)
          if (file) {
            setMp3ObjectUrl(URL.createObjectURL(file))
            setPreviewStartSec(0)
            setTrackDurationSec(null)
          } else {
            setMp3ObjectUrl(null)
          }
        }}
      />

      <PreviewRegionPicker
        audioSrc={mp3ObjectUrl}
        startSec={previewStartSec}
        durationSec={trackDurationSec}
        onChange={(start, dur) => {
          setPreviewStartSec(start)
          setTrackDurationSec(dur)
        }}
      />

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input name="for_sale" type="checkbox" value="true" defaultChecked />
        Available for purchase
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input name="is_promoted" type="checkbox" value="true" defaultChecked />
        Promote on homepage
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-300">
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
