'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'

const inputClass =
  'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500'

export type SongAiFieldsProps = {
  title: string
  artist: string
  description: string
  genre: string
  onDescriptionChange: (value: string) => void
  onGenreChange: (value: string) => void
  /** Require MP3 selection (new song) */
  mp3Required?: boolean
  /** Existing cover URL when editing */
  currentCoverUrl?: string | null
  /** Controlled cover path from AI generation */
  albumCoverPath: string
  onAlbumCoverPathChange: (path: string) => void
  coverPreviewUrl: string | null
  onCoverPreviewUrlChange: (url: string | null) => void
  imagePrompt: string
  onImagePromptChange: (value: string) => void
  /** Optional: notify parent when user picks a cover file */
  onCoverFileChange?: (file: File | null) => void
  mp3FileName?: string | null
  onMp3FileChange?: (file: File | null) => void
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function SongAiFields({
  title,
  artist,
  description,
  genre,
  onDescriptionChange,
  onGenreChange,
  mp3Required = false,
  currentCoverUrl,
  albumCoverPath,
  onAlbumCoverPathChange,
  coverPreviewUrl,
  onCoverPreviewUrlChange,
  imagePrompt,
  onImagePromptChange,
  onCoverFileChange,
  mp3FileName,
  onMp3FileChange,
}: SongAiFieldsProps) {
  const mp3InputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [mp3Label, setMp3Label] = useState(mp3FileName || '')
  const [dragOver, setDragOver] = useState(false)
  const [metaLoading, setMetaLoading] = useState(false)
  const [coverLoading, setCoverLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const displayCover = coverPreviewUrl || currentCoverUrl || null

  const acceptMp3 = useCallback(
    (file: File | null) => {
      if (!file) {
        setMp3Label('')
        onMp3FileChange?.(null)
        return
      }
      const ok =
        /\.mp3$/i.test(file.name) ||
        file.type === 'audio/mpeg' ||
        file.type === 'audio/mp3' ||
        file.type.startsWith('audio/')
      if (!ok) {
        setAiError('Please upload an MP3 / audio file')
        return
      }
      setAiError('')
      setMp3Label(`${file.name} (${formatBytes(file.size)})`)
      onMp3FileChange?.(file)
      if (mp3InputRef.current) {
        const dt = new DataTransfer()
        dt.items.add(file)
        mp3InputRef.current.files = dt.files
      }
    },
    [onMp3FileChange]
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) acceptMp3(file)
  }

  const generateInfo = async () => {
    setAiError('')
    if (!title.trim()) {
      setAiError('Enter a song title first')
      return
    }
    setMetaLoading(true)
    try {
      const res = await fetch('/api/admin/songs/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), artist: artist.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate info')
      onDescriptionChange(String(data.description || ''))
      onGenreChange(String(data.genre || ''))
      onImagePromptChange(String(data.imagePrompt || ''))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate info')
    } finally {
      setMetaLoading(false)
    }
  }

  const generateCover = async () => {
    setAiError('')
    const prompt = imagePrompt.trim()
    if (!prompt && !title.trim()) {
      setAiError('Generate info first, or enter a cover prompt / title')
      return
    }
    setCoverLoading(true)
    try {
      const res = await fetch('/api/admin/songs/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || undefined,
          title: title.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate cover')
      const path = String(data.album_cover_path || '')
      const preview = String(data.previewUrl || path)
      onAlbumCoverPathChange(path)
      onCoverPreviewUrlChange(preview)
      onCoverFileChange?.(null)
      if (coverInputRef.current) coverInputRef.current.value = ''
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate cover')
    } finally {
      setCoverLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-sm text-gray-400">Description</label>
          <button
            type="button"
            onClick={generateInfo}
            disabled={metaLoading || !title.trim()}
            className="px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider hover:bg-gold/30 disabled:opacity-50"
          >
            {metaLoading ? 'Generating…' : 'Generate info with AI'}
          </button>
        </div>
        <textarea
          name="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Description"
          rows={3}
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Genre</label>
        <input
          name="genre"
          value={genre}
          onChange={(e) => onGenreChange(e.target.value)}
          placeholder="Genre"
          className={inputClass}
        />
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">Cover image prompt</label>
        <textarea
          value={imagePrompt}
          onChange={(e) => onImagePromptChange(e.target.value)}
          placeholder="AI cover prompt (filled by Generate info, or write your own)"
          rows={3}
          className={inputClass}
        />
        <button
          type="button"
          onClick={generateCover}
          disabled={coverLoading || (!imagePrompt.trim() && !title.trim())}
          className="mt-2 px-4 py-1.5 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50"
        >
          {coverLoading ? 'Generating cover…' : 'Generate cover'}
        </button>
      </div>

      {(displayCover || albumCoverPath) && (
        <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg border border-white/10">
          {displayCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayCover}
              alt="Album cover preview"
              className="w-24 h-24 rounded-lg object-cover border border-gold/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-black/50 border border-white/10" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {albumCoverPath ? 'AI cover ready' : 'Current cover'}
            </p>
            <p className="text-sm text-gray-300 truncate">
              {albumCoverPath || currentCoverUrl || '—'}
            </p>
          </div>
        </div>
      )}

      {albumCoverPath ? (
        <input type="hidden" name="album_cover_path" value={albumCoverPath} />
      ) : null}

      <div>
        <label className="text-sm text-gray-400 block mb-2">
          MP3 / Audio File{mp3Required ? ' *' : ' (optional replace)'}
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-gold bg-gold/10' : 'border-white/20 bg-black/30'
          }`}
        >
          <p className="text-sm text-gray-300 mb-2">
            {mp3Label || 'Drag & drop an MP3 here, or click to browse'}
          </p>
          <button
            type="button"
            onClick={() => mp3InputRef.current?.click()}
            className="text-xs uppercase tracking-wider text-gold hover:text-white"
          >
            Choose file
          </button>
          <input
            ref={mp3InputRef}
            name="mp3"
            type="file"
            accept=".mp3,audio/mpeg,audio/mp3,audio/*"
            required={mp3Required}
            className="sr-only"
            onChange={(e) => acceptMp3(e.target.files?.[0] || null)}
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-400 block mb-2">
          Album cover file{albumCoverPath ? ' (optional — AI cover already set)' : ''}
        </label>
        <input
          ref={coverInputRef}
          name="cover"
          type="file"
          accept="image/*"
          className="w-full text-sm text-gray-300"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            onCoverFileChange?.(file)
            if (file) {
              onAlbumCoverPathChange('')
              onCoverPreviewUrlChange(URL.createObjectURL(file))
            }
          }}
        />
      </div>

      {aiError && <p className="text-red-400 text-sm">{aiError}</p>}
    </div>
  )
}
