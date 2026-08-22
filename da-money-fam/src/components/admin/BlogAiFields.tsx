'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'

const inputClass =
  'mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white normal-case tracking-normal'

export type BlogAiFieldsProps = {
  title: string
  excerpt: string
  slug: string
  content: string
  coverImageUrl: string
  imagePrompt: string
  onExcerptChange: (v: string) => void
  onSlugChange: (v: string) => void
  onContentChange: (v: string) => void
  onCoverImageUrlChange: (v: string) => void
  onImagePromptChange: (v: string) => void
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function BlogAiFields({
  title,
  excerpt,
  slug,
  content,
  coverImageUrl,
  imagePrompt,
  onExcerptChange,
  onSlugChange,
  onContentChange,
  onCoverImageUrlChange,
  onImagePromptChange,
}: BlogAiFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [coverLoading, setCoverLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [aiError, setAiError] = useState('')

  const generateInfo = async () => {
    setAiError('')
    if (!title.trim()) {
      setAiError('Enter a blog title first')
      return
    }
    setMetaLoading(true)
    try {
      const res = await fetch('/api/admin/blog/ai-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate info')
      onExcerptChange(String(data.excerpt || ''))
      onSlugChange(String(data.slug || ''))
      onContentChange(String(data.content || ''))
      onImagePromptChange(String(data.imagePrompt || ''))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate info')
    } finally {
      setMetaLoading(false)
    }
  }

  const generateCover = async () => {
    setAiError('')
    if (!imagePrompt.trim() && !title.trim()) {
      setAiError('Generate info first, or enter a cover prompt / title')
      return
    }
    setCoverLoading(true)
    try {
      const res = await fetch('/api/admin/blog/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim() || undefined,
          title: title.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate cover')
      onCoverImageUrlChange(String(data.cover_image_url || data.previewUrl || ''))
      setUploadLabel('')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate cover')
    } finally {
      setCoverLoading(false)
    }
  }

  const uploadCoverFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      setAiError('')

      const typeOk =
        /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type) ||
        /\.(jpe?g|png|webp|gif)$/i.test(file.name)
      if (!typeOk) {
        setAiError('Please upload a JPEG, PNG, WebP, or GIF image')
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        setAiError('Image too large (max 8MB)')
        return
      }

      setUploadLoading(true)
      setUploadLabel(`${file.name} (${formatBytes(file.size)})`)
      try {
        const formData = new FormData()
        formData.set('cover', file)
        const res = await fetch('/api/admin/blog/upload-cover', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to upload cover')
        onCoverImageUrlChange(String(data.cover_image_url || data.previewUrl || ''))
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Failed to upload cover')
        setUploadLabel('')
      } finally {
        setUploadLoading(false)
      }
    },
    [onCoverImageUrlChange]
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadCoverFile(file)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-gray-500">AI tools</span>
        <button
          type="button"
          onClick={generateInfo}
          disabled={metaLoading || !title.trim()}
          className="px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider hover:bg-gold/30 disabled:opacity-50"
        >
          {metaLoading ? 'Generating…' : 'Generate info with AI'}
        </button>
      </div>

      <label className="block text-xs uppercase tracking-wider text-gray-500">
        Slug
        <input value={slug} onChange={(e) => onSlugChange(e.target.value)} className={inputClass} />
      </label>

      <label className="block text-xs uppercase tracking-wider text-gray-500">
        Excerpt
        <textarea
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </label>

      <label className="block text-xs uppercase tracking-wider text-gray-500">
        Content
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={10}
          className={inputClass}
        />
      </label>

      <label className="block text-xs uppercase tracking-wider text-gray-500">
        Cover image prompt
        <textarea
          value={imagePrompt}
          onChange={(e) => onImagePromptChange(e.target.value)}
          placeholder="Filled by Generate info, or write your own"
          rows={3}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        onClick={generateCover}
        disabled={coverLoading || (!imagePrompt.trim() && !title.trim())}
        className="px-4 py-1.5 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50"
      >
        {coverLoading ? 'Generating cover…' : 'Generate cover'}
      </button>

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Upload cover image</p>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-5 text-center transition-colors ${
            dragOver ? 'border-gold bg-gold/10' : 'border-white/20 bg-black/30'
          }`}
        >
          <p className="text-sm text-gray-300 mb-2">
            {uploadLoading
              ? 'Uploading…'
              : uploadLabel || 'Drag & drop an image here, or click to browse'}
          </p>
          <button
            type="button"
            disabled={uploadLoading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs uppercase tracking-wider text-gold hover:text-white disabled:opacity-50"
          >
            Choose image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              void uploadCoverFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {coverImageUrl ? (
        <div className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt="Blog cover preview"
            className="w-32 h-20 rounded-lg object-cover border border-gold/30"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Cover preview</p>
            <p className="text-xs text-gray-300 break-all">{coverImageUrl}</p>
          </div>
        </div>
      ) : null}

      <label className="block text-xs uppercase tracking-wider text-gray-500">
        Cover image URL
        <input
          value={coverImageUrl}
          onChange={(e) => onCoverImageUrlChange(e.target.value)}
          placeholder="/store/blog/... or https://..."
          className={inputClass}
        />
      </label>

      {aiError && <p className="text-red-400 text-sm">{aiError}</p>}
    </div>
  )
}
