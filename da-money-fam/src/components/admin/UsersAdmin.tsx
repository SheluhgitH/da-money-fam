'use client'

import { useCallback, useEffect, useState } from 'react'

type UserRow = {
  id: string
  email: string | null
  display_name: string | null
  fan_club_manual: boolean
  stripe_fan_status: string | null
  fan_club_active: boolean
  level: number
  xp: number
  coinz: number
  created_at: string
}

type UserDetail = UserRow & {
  avatar_url?: string | null
  stats?: { xp: number; level: number; streak: number }
  ledger?: Array<{
    id: string
    amount: number
    balance_after: number
    reason: string
    admin_note: string | null
    created_at: string
  }>
  song_orders?: Array<{ id: string; song_title: string; status: string; created_at: string }>
  merch_orders?: Array<{ id: string; merch_name: string; status: string; price: number }>
  service_orders?: Array<{ id: string; package_name: string; status: string }>
  ad_studio_count?: number
}

export default function UsersAdmin() {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [coinDelta, setCoinDelta] = useState('50')
  const [coinNote, setCoinNote] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (search = q) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}&limit=50`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load users')
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    load('')
  }, [])

  const openUser = async (id: string) => {
    setMessage('')
    const res = await fetch(`/api/admin/users/${id}`)
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error || 'Failed to load user')
      return
    }
    setSelected(data.user)
    setCoinNote('')
    setEmailSubject('')
    setEmailBody('')
  }

  const patch = async (body: Record<string, unknown>) => {
    if (!selected) return
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setMessage('Saved')
      await openUser(selected.id)
      await load(q)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm text-gold">{message}</p>}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(q)}
          placeholder="Search email or display name…"
          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => load(q)}
          className="px-5 py-2.5 rounded-full bg-gold text-black text-xs font-bold uppercase tracking-wider"
        >
          Search
        </button>
        <p className="text-xs text-gray-500">{total} users</p>
      </div>

      <div className="grid xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-sm">No users found.</p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => openUser(u.id)}
                className={`w-full text-left glass rounded-xl p-3 transition-colors ${
                  selected?.id === u.id ? 'border border-gold/40' : 'hover:bg-white/5'
                }`}
              >
                <p className="text-sm text-white truncate">{u.email || u.display_name || u.id.slice(0, 8)}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  L{u.level} · {u.coinz}c · {u.fan_club_active ? 'Fan Club' : 'Free'}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="xl:col-span-3 glass rounded-xl p-5 space-y-5">
          {!selected ? (
            <p className="text-gray-500 text-sm">Select a user to manage.</p>
          ) : (
            <>
              <div>
                <h3 className="font-serif text-2xl text-gold">{selected.display_name || 'Fan'}</h3>
                <p className="text-sm text-gray-400">{selected.email || 'No email'}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Joined {new Date(selected.created_at).toLocaleDateString()} · ID {selected.id.slice(0, 8)}…
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Level" value={selected.stats?.level ?? selected.level} />
                <MiniStat label="XP" value={selected.stats?.xp ?? selected.xp} />
                <MiniStat label="Coinz" value={selected.coinz} />
                <MiniStat label="Ads" value={selected.ad_studio_count ?? 0} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => patch({ fan_club_manual: !selected.fan_club_manual })}
                  className={`text-xs px-4 py-2 rounded-full uppercase tracking-wider ${
                    selected.fan_club_manual ? 'bg-gold text-black' : 'bg-white/10 text-white'
                  }`}
                >
                  Manual Fan Club: {selected.fan_club_manual ? 'ON' : 'OFF'}
                </button>
                <span className="text-[11px] text-gray-500">
                  Stripe: {selected.stripe_fan_status || 'none'}
                </span>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Adjust Coinz</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={coinDelta}
                    onChange={(e) => setCoinDelta(e.target.value)}
                    className="w-28 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    placeholder="+/-"
                  />
                  <input
                    value={coinNote}
                    onChange={(e) => setCoinNote(e.target.value)}
                    className="flex-1 min-w-[160px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    placeholder="Required note"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      patch({ adjust_coinz: Number(coinDelta), admin_note: coinNote })
                    }
                    className="px-4 py-2 rounded-full bg-gold text-black text-xs font-bold uppercase"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Email user</p>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={3}
                  placeholder="Message"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busy || !emailSubject || !emailBody}
                  onClick={() =>
                    patch({
                      send_email: true,
                      email_subject: emailSubject,
                      email_body: emailBody,
                    })
                  }
                  className="px-4 py-2 rounded-full bg-blue-500/20 text-blue-200 text-xs uppercase tracking-wider disabled:opacity-40"
                >
                  Send email
                </button>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Coinz ledger</p>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {(selected.ledger || []).length === 0 ? (
                    <li className="text-xs text-gray-500">No ledger entries yet.</li>
                  ) : (
                    (selected.ledger || []).map((e) => (
                      <li key={e.id} className="text-xs text-gray-400 flex justify-between gap-2">
                        <span>
                          {e.amount > 0 ? '+' : ''}
                          {e.amount} · {e.reason}
                          {e.admin_note ? ` · ${e.admin_note}` : ''}
                        </span>
                        <span className="text-gray-600 shrink-0">
                          {new Date(e.created_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-black/30 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white mt-0.5">{value}</p>
    </div>
  )
}
