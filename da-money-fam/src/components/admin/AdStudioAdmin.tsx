'use client'

import { useEffect, useMemo, useState } from 'react'

type GenRow = {
  id: string
  user_id: string
  user_email?: string | null
  brief: string | null
  status: string
  featured: boolean
  admin_hidden?: boolean
  admin_notes?: string | null
  coinz_spent: number
  refunded_at?: string | null
  refund_coinz?: number
  model: string
  mode: string
  video_urls?: string[]
  created_at: string
}

type Stats = {
  today: number
  coinzSpentToday: number
  failedToday: number
  failRate: number
}

export default function AdStudioAdmin() {
  const [items, setItems] = useState<GenRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<GenRow | null>(null)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [imageTiers, setImageTiers] = useState<
    Array<{
      tier: string
      label: string
      gens: number
      avgUsdCost: number
      avgRealRevenueUsd: number
      impliedMargin: number | null
      overBuffer: boolean
    }>
  >([])

  const load = async () => {
    setLoading(true)
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await fetch(`/api/admin/ad-studio${qs}`)
    const data = await res.json()
    setItems(data.items || [])
    setStats(data.stats || null)
    setLoading(false)
  }

  const loadImageMargin = async () => {
    try {
      const res = await fetch('/api/admin/ad-studio/images')
      const data = await res.json()
      if (res.ok) setImageTiers(data.tiers || [])
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load()
    loadImageMargin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const filtered = useMemo(() => items, [items])

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/ad-studio', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error || 'Update failed')
      return
    }
    setMessage('Updated')
    await load()
    if (selected?.id === id) setSelected({ ...selected, ...data.item })
  }

  const refund = async (id: string) => {
    if (!confirm('Refund Coinz for this generation?')) return
    const res = await fetch('/api/admin/ad-studio/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error || 'Refund failed')
      return
    }
    setMessage('Refunded')
    await load()
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Gens today" value={stats.today} />
          <Stat label="Coinz spent today" value={stats.coinzSpentToday} />
          <Stat label="Failed today" value={stats.failedToday} />
          <Stat label="Fail rate" value={`${stats.failRate}%`} />
        </div>
      )}

      {imageTiers.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-gold">Image margin (7d, USD)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {imageTiers.map((t) => (
              <div
                key={t.tier}
                className={`rounded-lg p-3 bg-black/40 border ${
                  t.overBuffer ? 'border-red-400/50' : 'border-white/10'
                }`}
              >
                <p className="text-[10px] uppercase text-gray-500">{t.label}</p>
                <p className="text-sm text-white mt-1">
                  {t.gens} gens · margin {t.impliedMargin != null ? `${t.impliedMargin}%` : '—'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  cost ${t.avgUsdCost} · rev ${t.avgRealRevenueUsd}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'processing', 'failed', 'completed'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider ${
              status === s ? 'bg-gold text-black' : 'bg-white/10 text-gray-300'
            }`}
          >
            {s || 'all'}
          </button>
        ))}
        <button type="button" onClick={load} className="text-xs px-3 py-1 rounded-full border border-gold/30 text-gold">
          Refresh
        </button>
      </div>

      {message && <p className="text-sm text-gold">{message}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-2">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-sm">No generations.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelected(item)
                  setNotes(item.admin_notes || '')
                }}
                className={`w-full text-left glass rounded-xl p-4 border ${
                  selected?.id === item.id ? 'border-gold' : 'border-white/10'
                }`}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white text-sm line-clamp-2">{item.brief || 'Untitled'}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {item.user_email || item.user_id.slice(0, 8)} · {item.status} · {item.mode}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gold font-mono text-sm">{item.coinz_spent}c</p>
                    <p className="text-[10px] text-gray-500">
                      {item.admin_hidden || item.featured === false ? 'Hidden' : 'On site'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="xl:col-span-2 glass rounded-xl p-5 space-y-4">
          {!selected ? (
            <p className="text-gray-500 text-sm">Select a generation.</p>
          ) : (
            <>
              {selected.video_urls?.[0] && (
                <video src={selected.video_urls[0]} controls className="w-full rounded-lg bg-black" />
              )}
              <p className="text-white text-sm">{selected.brief}</p>
              <p className="text-xs text-gray-500">
                {selected.user_email || selected.user_id} · {new Date(selected.created_at).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Model: {selected.model}</p>
              {selected.refunded_at && (
                <p className="text-xs text-green-400">Refunded {selected.refund_coinz} Coinz</p>
              )}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white"
                rows={3}
                placeholder="Admin notes"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patch(selected.id, { admin_notes: notes })}
                  className="text-xs px-3 py-2 rounded-full bg-white/10 text-white"
                >
                  Save notes
                </button>
                <button
                  type="button"
                  onClick={() => patch(selected.id, { featured: selected.admin_hidden || !selected.featured })}
                  className="text-xs px-3 py-2 rounded-full bg-gold/20 text-gold"
                >
                  {selected.admin_hidden || !selected.featured ? 'Show on site' : 'Hide from site'}
                </button>
                {!selected.refunded_at && selected.coinz_spent > 0 && (
                  <button
                    type="button"
                    onClick={() => refund(selected.id)}
                    className="text-xs px-3 py-2 rounded-full bg-red-500/20 text-red-300"
                  >
                    Refund Coinz
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  )
}
