'use client'

import { useEffect, useState } from 'react'

type Entry = {
  id: string
  action: string
  entity: string
  entity_id: string | null
  payload: unknown
  created_at: string
}

export default function ActivityLogPanel() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [entity, setEntity] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (filter = entity) => {
    setLoading(true)
    const qs = filter ? `?entity=${encodeURIComponent(filter)}` : ''
    const res = await fetch(`/api/admin/audit${qs}`)
    const data = await res.json()
    setEntries(data.entries || [])
    setLoading(false)
  }

  useEffect(() => {
    load('')
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All entities</option>
          <option value="user">user</option>
          <option value="site_settings">site_settings</option>
          <option value="ad_studio_generation">ad_studio_generation</option>
          <option value="merch_order">merch_order</option>
          <option value="service_order">service_order</option>
          <option value="blog_post">blog_post</option>
        </select>
        <button
          type="button"
          onClick={() => load(entity)}
          className="px-4 py-2 rounded-full bg-white/10 text-xs uppercase tracking-wider"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-sm">No audit entries yet.</p>
      ) : (
        <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
          {entries.map((e) => (
            <li key={e.id} className="glass rounded-lg p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gold">
                  {e.action} · {e.entity}
                  {e.entity_id ? ` · ${e.entity_id.slice(0, 8)}` : ''}
                </span>
                <span className="text-[11px] text-gray-500 shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              {e.payload != null && (
                <pre className="text-[10px] text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(e.payload)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
