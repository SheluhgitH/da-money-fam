'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CHARACTER_STYLES, characterRandomizeFacePrompt, characterRemixLookPrompt, characterSheetPrompt, getCharacterStyle } from '@/lib/character-styles'
import { IMAGE_MODELS, type ImageTier } from '@/lib/image-models'
import { LEGACY_IMAGE_BASE } from '@/lib/ad-studio-legacy-prices'
import { compressImageForUpload } from '@/lib/compress-image'
import type { ImageStudioController } from '@/hooks/useImageStudio'
import CoinzPriceCut from './CoinzPriceCut'

interface CharacterRow {
  id: string
  name: string
  style_id: string
  prompt: string | null
  sheet_urls: string[]
  ref_urls: string[]
  primary_url: string | null
  created_at: string
  updated_at: string
}

export default function CharacterStudioPanel({
  images,
  onUseForVideo,
  onMakeStoryboard,
}: {
  images: ImageStudioController
  onUseForVideo?: (url: string, characterId?: string, styleId?: string) => void
  onMakeStoryboard?: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<CharacterRow[]>([])
  const [name, setName] = useState('')
  const [styleId, setStyleId] = useState(CHARACTER_STYLES[0].id)
  const [notes, setNotes] = useState('')
  const [refs, setRefs] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createTier, setCreateTier] = useState<ImageTier>('draft')
  const [editTier, setEditTier] = useState<ImageTier>('edit')
  const [remixPrompt, setRemixPrompt] = useState('')

  const selected = items.find((c) => c.id === selectedId) || null

  const load = useCallback(async () => {
    const res = await fetch('/api/images/characters')
    if (!res.ok) return
    const data = await res.json()
    setItems(data.items || [])
  }, [])

  useEffect(() => {
    void load()
    void images.fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setSelectedId(null)
    setName('')
    setNotes('')
    setRefs([])
    setRemixPrompt('')
  }, [images.jobNonce])

  const uploadRefs = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files).slice(0, 2)) {
        const compressed = await compressImageForUpload(file)
        const res = await fetch('/api/ad-studio/upload-ref', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: compressed.dataUrl,
            contentType: compressed.contentType,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        setRefs((prev) => [...prev, data.url as string].slice(0, 3))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const generateSheet = async (tier: ImageTier, prompt: string, referenceUrls: string[]) => {
    let quoteRes = await fetch(`/api/images/quote?tier=${tier}`)
    let quote = await quoteRes.json()
    if (!quoteRes.ok) throw new Error(quote.error || 'Quote failed')
    const res = await fetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        prompt,
        tier,
        mode: referenceUrls.length && (tier === 'edit' || tier === 'smart') ? 'edit' : 'generate',
        aspect_ratio: '9:16',
        reference_urls: referenceUrls,
      }),
    })
    const data = await res.json()
    if (res.status === 409) {
      quoteRes = await fetch(`/api/images/quote?tier=${tier}`)
      quote = await quoteRes.json()
      throw new Error('Quote expired — try again')
    }
    if (res.status === 402) throw new Error('Insufficient Coinz')
    if (!res.ok) throw new Error(data.error || 'Generation failed')
    return data.url as string
  }

  const createCharacter = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const prompt = characterSheetPrompt({ name: name.trim(), styleId, extra: notes })
      const res = await fetch('/api/images/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          style_id: styleId,
          prompt,
          ref_urls: refs,
        }),
      })
      const created = await res.json()
      if (!res.ok) throw new Error(created.error || 'Create failed')
      const row = created.item as CharacterRow
      const url = await generateSheet(createTier, prompt, refs)
      const patchRes = await fetch(`/api/images/characters/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_urls: [url],
          primary_url: url,
        }),
      })
      const patched = await patchRes.json()
      if (!patchRes.ok) throw new Error(patched.error || 'Save sheet failed')
      setSelectedId(row.id)
      await load()
      await images.fetchLibrary()
      await images.fetchQuote()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  const editSelected = async () => {
    if (!selected || busy) return
    const prompt = characterRemixLookPrompt({ name: selected.name, extra: remixPrompt })
    await applySheetEdit(prompt)
  }

  const randomizeFace = async () => {
    if (!selected || busy) return
    const prompt = characterRandomizeFacePrompt({ name: selected.name, extra: remixPrompt })
    await applySheetEdit(prompt)
  }

  const applySheetEdit = async (prompt: string) => {
    if (!selected) return
    const refsForEdit = selected.primary_url
      ? [selected.primary_url, ...selected.ref_urls]
      : selected.ref_urls
    setBusy(true)
    setError(null)
    try {
      const url = await generateSheet(editTier, prompt, refsForEdit.slice(0, 3))
      const sheets = [url, ...selected.sheet_urls].slice(0, 8)
      const patchRes = await fetch(`/api/images/characters/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_urls: sheets,
          primary_url: url,
          prompt,
        }),
      })
      const patched = await patchRes.json()
      if (!patchRes.ok) throw new Error(patched.error || 'Update failed')
      await load()
      await images.fetchLibrary()
      await images.fetchQuote()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Edit failed')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this character?')) return
    await fetch(`/api/images/characters/${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  const draftPrice = images.quote?.tierPrices?.draft?.priceCoins ?? IMAGE_MODELS.draft.baseCoins
  const smartPrice = images.quote?.tierPrices?.smart?.priceCoins ?? IMAGE_MODELS.smart.baseCoins
  const editPrice = images.quote?.tierPrices?.edit?.priceCoins ?? IMAGE_MODELS.edit.baseCoins

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-3 pb-3 space-y-3 border-b border-gold/10">
        <div>
          <p className="font-serif text-gold text-lg leading-none">Characters</p>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.2em] mt-1">
            Private library · sheet · edit · use for video
          </p>
          <button
            type="button"
            onClick={() => images.resetJob()}
            className="mt-2 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-white/15 text-white/60"
          >
            New
          </button>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-gold"
          />
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value)}
            className="bg-black border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none"
          >
            {CHARACTER_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional look notes (outfit, mood)…"
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-gold resize-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void uploadRefs(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-gold/25 text-gold/80"
          >
            Face / body refs
          </button>
          {refs.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="w-10 h-10 rounded object-cover border border-gold/20" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateTier('draft')}
            className={`text-[10px] uppercase px-2.5 py-1.5 min-h-[28px] rounded-md border ${
              createTier === 'draft' ? 'bg-gold text-black border-gold' : 'border-white/15 text-white/60'
            }`}
          >
            Draft · <CoinzPriceCut current={draftPrice} legacy={LEGACY_IMAGE_BASE.draft} />
          </button>
          <button
            type="button"
            onClick={() => setCreateTier('smart')}
            className={`text-[10px] uppercase px-2.5 py-1.5 min-h-[28px] rounded-md border ${
              createTier === 'smart' ? 'bg-gold text-black border-gold' : 'border-white/15 text-white/60'
            }`}
          >
            Smart · <CoinzPriceCut current={smartPrice} legacy={LEGACY_IMAGE_BASE.smart} />
          </button>
        </div>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void createCharacter()}
          className="w-full text-[10px] uppercase tracking-wider px-3 py-3 rounded-full bg-gold text-black font-bold disabled:opacity-40"
        >
          {busy ? 'Working…' : 'Create sheet'}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {selected && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gold/70">
              {selected.name} · {getCharacterStyle(selected.style_id).label}
            </p>
            {selected.primary_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.primary_url}
                alt=""
                className="w-full max-h-[42vh] object-contain rounded-xl border border-gold/20 bg-black"
              />
            )}
            <textarea
              rows={2}
              value={remixPrompt}
              onChange={(e) => setRemixPrompt(e.target.value)}
              placeholder="Remix: change outfit or lighting, keep identity. Randomize face: describe ethnicity/age/hair or leave blank to invent a new face."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-gold resize-none"
            />
            {selected.style_id === 'photoreal' && (
              <p className="text-[10px] text-white/40">
                Mini/Fast auto-prepare photoreal sheets for Seedance. Lite works unmarked. Anime /
                comic / clay still pass Mini/Fast without extra processing.
              </p>
            )}
            {!selected.primary_url && (
              <p className="text-[10px] text-white/40">
                Create a sheet first, then Remix look or Randomize face.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditTier('edit')}
                className={`text-[10px] uppercase px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  editTier === 'edit' ? 'bg-gold text-black border-gold' : 'border-white/15 text-white/60'
                }`}
              >
                Edit tier · <CoinzPriceCut current={editPrice} legacy={LEGACY_IMAGE_BASE.edit} />
              </button>
              <button
                type="button"
                onClick={() => setEditTier('smart')}
                className={`text-[10px] uppercase px-2.5 py-1.5 min-h-[28px] rounded-md border ${
                  editTier === 'smart' ? 'bg-gold text-black border-gold' : 'border-white/15 text-white/60'
                }`}
              >
                Smart tier · <CoinzPriceCut current={smartPrice} legacy={LEGACY_IMAGE_BASE.smart} />
              </button>
              <button
                type="button"
                disabled={busy || !selected.primary_url}
                onClick={() => void editSelected()}
                className="text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold text-gold disabled:opacity-40"
              >
                Remix look
              </button>
              <button
                type="button"
                disabled={busy || !selected.primary_url}
                onClick={() => void randomizeFace()}
                className="text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold/40 text-gold/90 disabled:opacity-40"
              >
                Randomize face
              </button>
              {selected.primary_url && onMakeStoryboard && (
                <button
                  type="button"
                  onClick={() => onMakeStoryboard(selected.primary_url!)}
                  className="text-[10px] uppercase tracking-wider px-3 py-1.5 min-h-[28px] rounded-full border border-gold text-gold"
                >
                  Make storyboard
                </button>
              )}
            </div>
            {selected.primary_url && onUseForVideo && (
              <button
                type="button"
                onClick={() =>
                  onUseForVideo(selected.primary_url!, selected.id, selected.style_id)
                }
                className="w-full text-[10px] uppercase tracking-wider px-3 py-3 rounded-full bg-gold text-black font-bold"
              >
                Use for video
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`text-left rounded-xl overflow-hidden border ${
                selectedId === c.id ? 'border-gold' : 'border-white/10'
              }`}
            >
              <div className="aspect-[3/4] bg-black/60">
                {c.primary_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.primary_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30">
                    No sheet
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                <span className="text-[11px] truncate">{c.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(c.id)
                  }}
                  className="text-[10px] text-white/35 hover:text-red-300"
                >
                  ×
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
