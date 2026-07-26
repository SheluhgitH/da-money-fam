'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OrderStatus, PaymentSettings, PurchaseOrder, MerchOrder, ServiceOrder, Song } from '@/types/store'
import NewSongForm from './NewSongForm'
import EditSongForm from './EditSongForm'

type Tab = 'overview' | 'songs' | 'orders' | 'merch' | 'services' | 'settings' | 'new' | 'edit'
type OrderFilter = 'all' | OrderStatus

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {hint && <p className="text-xs text-gray-500 mt-2">{hint}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview')
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')
  const [songs, setSongs] = useState<Song[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [merchOrders, setMerchOrders] = useState<MerchOrder[]>([])
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([])
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    setMessage('')
    try {
      const [songsRes, ordersRes, merchRes, serviceRes, settingsRes] = await Promise.all([
        fetch('/api/admin/songs'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/merch-orders'),
        fetch('/api/admin/service-orders'),
        fetch('/api/admin/payment-settings'),
      ])

      if (songsRes.status === 401 || ordersRes.status === 401) {
        setMessage('Session expired. Please log in again.')
        window.location.href = '/admin/login'
        return
      }

      const songsData = await songsRes.json()
      const ordersData = await ordersRes.json()
      const merchData = merchRes.ok ? await merchRes.json() : { orders: [] }
      const serviceData = serviceRes.ok ? await serviceRes.json() : { orders: [] }
      const settingsData = await settingsRes.json()

      if (!songsRes.ok) {
        setMessage(songsData.error || 'Failed to load songs')
      }

      setSongs(songsData.songs || [])
      setOrders(ordersData.orders || [])
      setMerchOrders(merchData.orders || [])
      setServiceOrders(serviceData.orders || [])
      setSettings(settingsData.settings || null)
    } catch (error) {
      console.error(error)
      setMessage('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = useMemo(() => {
    const published = songs.filter((s) => s.is_published).length
    const promoted = songs.filter((s) => s.is_promoted).length
    const pending = orders.filter((o) => o.status === 'pending').length
    const delivered = orders.filter((o) => o.status === 'delivered').length
    const merchRevenue = merchOrders.reduce((sum, o) => sum + o.price, 0)
    const serviceRevenue = serviceOrders.reduce((sum, o) => sum + o.deposit_amount, 0)
    const revenue = orders
      .filter((o) => o.status === 'delivered' || o.status === 'verified')
      .reduce((sum, order) => {
        const song = songs.find((s) => s.id === order.song_id)
        return sum + (song?.price || 0)
      }, 0)

    return { published, promoted, pending, delivered, revenue, merchRevenue, merchCount: merchOrders.length, serviceRevenue, serviceCount: serviceOrders.length }
  }, [songs, orders, merchOrders, serviceOrders])

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    return orders.filter((o) => o.status === orderFilter)
  }, [orders, orderFilter])

  const switchTab = (next: Tab) => {
    setTab(next)
    if (next !== 'edit') setEditingSong(null)
  }

  const startEdit = (song: Song) => {
    setEditingSong(song)
    setTab('edit')
    setMessage('')
  }

  const toggleSong = async (song: Song, field: 'is_published' | 'is_promoted' | 'for_sale') => {
    const res = await fetch('/api/admin/songs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: song.id, [field]: !song[field] }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage(`Updated ${song.title}`)
      loadData()
    } else {
      setMessage(data.error || `Failed to update ${song.title}`)
    }
  }

  const cycleAccess = async (song: Song) => {
    const order: Array<'public' | 'early' | 'exclusive'> = ['public', 'early', 'exclusive']
    const current = song.access || 'public'
    const next = order[(order.indexOf(current) + 1) % order.length]
    const payload: Record<string, unknown> = { id: song.id, access: next }
    if (next === 'exclusive') payload.for_sale = false
    if (next === 'public') payload.for_sale = true
    const res = await fetch('/api/admin/songs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage(`${song.title} access → ${next}`)
      loadData()
    } else {
      setMessage(data.error || `Failed to update access for ${song.title}`)
    }
  }

  const deleteSong = async (id: string) => {
    if (!confirm('Delete this song permanently?')) return
    const res = await fetch(`/api/admin/songs?id=${id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage('Song deleted')
      loadData()
    } else {
      setMessage(data.error || 'Failed to delete song')
    }
  }

  const notifySubscribers = async (song: Song) => {
    if (!confirm(`Send release alert to all newsletter subscribers for "${song.title}"?`)) return
    const res = await fetch('/api/admin/release-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ song_id: song.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`Release alert sent to ${data.sent} subscribers`)
    } else {
      setMessage(data.error || 'Failed to send release alert')
    }
  }

  const updateOrder = async (
    order: PurchaseOrder,
    status: PurchaseOrder['status'],
    sendEmail = false,
    adminNotes?: string
  ) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: order.id,
        status,
        send_email: sendEmail,
        admin_notes: adminNotes ?? order.admin_notes,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(data.download_url ? `Download link: ${data.download_url}` : 'Order updated')
      loadData()
    }
  }

  const saveOrderNotes = async (order: PurchaseOrder, notes: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status: order.status, admin_notes: notes }),
    })
    if (res.ok) {
      setMessage('Order notes saved')
      loadData()
    }
  }

  const copyDownloadLink = async (token: string) => {
    const baseUrl = window.location.origin
    await navigator.clipboard.writeText(`${baseUrl}/api/download/${token}`)
    setMessage('Download link copied to clipboard')
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    const res = await fetch('/api/admin/payment-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })

    if (res.ok) {
      setMessage('Payment settings saved')
      loadData()
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'songs', label: 'Songs' },
    { id: 'orders', label: 'Song Orders' },
    { id: 'merch', label: 'Merch Orders' },
    { id: 'services', label: 'Service Orders' },
    { id: 'settings', label: 'Payment' },
    { id: 'new', label: 'Add Song' },
  ]

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm uppercase tracking-wider transition-colors ${
              tab === t.id || (tab === 'edit' && t.id === 'songs')
                ? 'bg-gold text-black'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-6 p-4 bg-gold/10 border border-gold/30 rounded-lg text-sm text-gold break-all flex items-start justify-between gap-4">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-gold/70 hover:text-white shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === 'overview' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Songs" value={songs.length} hint={`${stats.published} published`} />
            <StatCard label="Promoted" value={stats.promoted} hint="Shown on homepage" />
            <StatCard label="Pending Orders" value={stats.pending} hint="Awaiting verification" />
            <StatCard label="Est. Revenue" value={`$${stats.revenue.toFixed(2)}`} hint={`${stats.delivered} delivered`} />
            <StatCard label="Merch Orders" value={stats.merchCount} hint={`$${stats.merchRevenue.toFixed(2)} merch`} />
            <StatCard label="Service Deposits" value={stats.serviceCount} hint={`$${stats.serviceRevenue.toFixed(2)} deposits`} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6">
              <h3 className="font-serif text-xl text-white mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => switchTab('new')}
                  className="px-4 py-2 rounded-full bg-gold text-black text-sm font-bold uppercase tracking-wider"
                >
                  Add Song
                </button>
                <button
                  onClick={() => switchTab('songs')}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                >
                  Manage Songs
                </button>
                <button
                  onClick={() => {
                    switchTab('orders')
                    setOrderFilter('pending')
                  }}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                >
                  Review Pending Orders
                </button>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h3 className="font-serif text-xl text-white mb-4">Recent Orders</h3>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet.</p>
              ) : (
                <ul className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-white truncate">{order.song_title}</p>
                        <p className="text-gray-500 truncate">{order.buyer_email}</p>
                      </div>
                      <span className="text-xs uppercase text-gold shrink-0">{order.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : tab === 'new' ? (
        <NewSongForm onCreated={() => { switchTab('songs'); setMessage('Song published'); loadData() }} />
      ) : tab === 'edit' && editingSong ? (
        <EditSongForm
          song={editingSong}
          onSaved={() => {
            switchTab('songs')
            setMessage('Song updated')
            loadData()
          }}
          onCancel={() => switchTab('songs')}
        />
      ) : tab === 'songs' ? (
        <div className="space-y-4">
          {songs.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-4">No songs in the catalog yet.</p>
              <button
                onClick={() => switchTab('new')}
                className="px-6 py-3 rounded-full bg-gold text-black font-bold uppercase tracking-wider text-sm"
              >
                Add First Song
              </button>
            </div>
          ) : (
            songs.map((song) => (
              <div key={song.id} className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                <img src={song.album_cover_path} alt={song.title} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{song.title}</h3>
                  <p className="text-gold text-sm">
                    {song.artist} · {song.for_sale ? `$${song.price.toFixed(2)}` : 'Not for sale'}
                    {song.genre ? ` · ${song.genre}` : ''}
                    {' · '}
                    {(song.access || 'public').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated {formatDate(song.updated_at)}
                    {!song.is_published && ' · Draft'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startEdit(song)}
                    className="text-xs px-3 py-1 rounded-full bg-gold/20 text-gold hover:bg-gold/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => cycleAccess(song)}
                    className={`text-xs px-3 py-1 rounded-full ${
                      song.access === 'exclusive'
                        ? 'bg-purple-500/30 text-purple-200'
                        : song.access === 'early'
                          ? 'bg-blue-500/30 text-blue-200'
                          : 'bg-white/10'
                    }`}
                  >
                    Access: {song.access || 'public'}
                  </button>
                  <button
                    onClick={() => toggleSong(song, 'for_sale')}
                    className={`text-xs px-3 py-1 rounded-full ${song.for_sale ? 'bg-white/10' : 'bg-purple-500/30 text-purple-200'}`}
                  >
                    {song.for_sale ? 'For Sale' : 'Not For Sale'}
                  </button>
                  <button
                    onClick={() => toggleSong(song, 'is_promoted')}
                    className={`text-xs px-3 py-1 rounded-full ${song.is_promoted ? 'bg-gold text-black' : 'bg-white/10'}`}
                  >
                    {song.is_promoted ? 'Promoted' : 'Promote'}
                  </button>
                  <button
                    onClick={() => toggleSong(song, 'is_published')}
                    className={`text-xs px-3 py-1 rounded-full ${song.is_published ? 'bg-green-500/20 text-green-300' : 'bg-white/10'}`}
                  >
                    {song.is_published ? 'Published' : 'Draft'}
                  </button>
                  <a
                    href={`/api/preview/${song.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 inline-flex items-center"
                  >
                    Preview
                  </a>
                  {song.is_published && (
                    <button
                      onClick={() => notifySubscribers(song)}
                      className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-200"
                    >
                      Notify Fans
                    </button>
                  )}
                  <button
                    onClick={() => deleteSong(song.id)}
                    className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'merch' ? (
        <div className="space-y-4">
          {merchOrders.length === 0 ? (
            <p className="text-gray-500">No merch orders yet.</p>
          ) : (
            merchOrders.map((order) => (
              <div key={order.id} className="glass rounded-xl p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold">{order.merch_name}</h3>
                    <p className="text-sm text-gray-400">
                      {order.buyer_name} · {order.buyer_email}
                    </p>
                    {order.size && (
                      <p className="text-xs text-gold mt-1 uppercase tracking-wider">Size: {order.size}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                    {order.shipping_address && (
                      <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">
                        Ship to: {order.shipping_address}
                      </p>
                    )}
                  </div>
                  <p className="text-gold font-mono text-lg shrink-0">${order.price.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'services' ? (
        <div className="space-y-4">
          {serviceOrders.length === 0 ? (
            <p className="text-gray-500">No service deposits yet.</p>
          ) : (
            serviceOrders.map((order) => (
              <div key={order.id} className="glass rounded-xl p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold">{order.package_name}</h3>
                    <p className="text-sm text-gray-400">
                      {order.buyer_name} · {order.buyer_email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
                    <p className="text-xs text-gold mt-1 uppercase tracking-wider">{order.status}</p>
                  </div>
                  <p className="text-gold font-mono text-lg shrink-0">${order.deposit_amount.toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === 'orders' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'delivered', 'verified', 'rejected'] as OrderFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setOrderFilter(filter)}
                className={`text-xs px-3 py-1 rounded-full uppercase tracking-wider ${
                  orderFilter === filter ? 'bg-gold text-black' : 'bg-white/10 text-gray-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="text-gray-500">No orders match this filter.</p>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdate={updateOrder}
                onSaveNotes={saveOrderNotes}
                onCopyLink={copyDownloadLink}
              />
            ))
          )}
        </div>
      ) : settings ? (
        <form onSubmit={saveSettings} className="glass rounded-xl p-6 space-y-4 max-w-2xl">
          <h2 className="font-serif text-2xl text-white mb-2">Payment Settings</h2>
          <p className="text-gray-500 text-sm mb-4">
            Configure manual payment methods shown to buyers (PayPal, CashApp, Venmo).
          </p>
          <input
            value={settings.paypal_email}
            onChange={(e) => setSettings({ ...settings, paypal_email: e.target.value })}
            placeholder="PayPal email"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3"
          />
          <input
            value={settings.cashapp_tag}
            onChange={(e) => setSettings({ ...settings, cashapp_tag: e.target.value })}
            placeholder="CashApp tag"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3"
          />
          <input
            value={settings.venmo_handle}
            onChange={(e) => setSettings({ ...settings, venmo_handle: e.target.value })}
            placeholder="Venmo handle"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3"
          />
          <input
            value={settings.contact_email}
            onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
            placeholder="Contact email"
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3"
          />
          <textarea
            value={settings.instructions}
            onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
            placeholder="Payment instructions"
            rows={4}
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3"
          />
          <button type="submit" className="bg-gold text-black font-bold px-6 py-3 rounded-full uppercase tracking-wider">
            Save Settings
          </button>
        </form>
      ) : null}
    </div>
  )
}

function OrderCard({
  order,
  onUpdate,
  onSaveNotes,
  onCopyLink,
}: {
  order: PurchaseOrder
  onUpdate: (order: PurchaseOrder, status: PurchaseOrder['status'], sendEmail?: boolean, adminNotes?: string) => void
  onSaveNotes: (order: PurchaseOrder, notes: string) => void
  onCopyLink: (token: string) => void
}) {
  const [notes, setNotes] = useState(order.admin_notes || '')

  return (
    <div className="glass rounded-xl p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold">{order.song_title}</h3>
          <p className="text-sm text-gray-400">
            {order.buyer_name} · {order.buyer_email}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {order.payment_method === 'stripe'
              ? `Stripe · ${order.stripe_session_id || order.payment_proof}`
              : `${order.payment_method}: ${order.payment_proof}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(order.created_at)}</p>
          <p className="text-xs text-gold mt-2 uppercase tracking-wider">{order.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === 'pending' && order.payment_method !== 'stripe' && (
            <>
              <button
                onClick={() => onUpdate(order, 'delivered', true)}
                className="text-xs px-3 py-2 rounded-full bg-gold text-black font-bold"
              >
                Verify & Send Download
              </button>
              <button
                onClick={() => onUpdate(order, 'rejected')}
                className="text-xs px-3 py-2 rounded-full bg-red-500/20 text-red-300"
              >
                Reject
              </button>
            </>
          )}
          {order.download_token && (
            <>
              <a
                href={`/api/download/${order.download_token}`}
                className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                Test Download
              </a>
              <button
                onClick={() => onCopyLink(order.download_token!)}
                className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20"
              >
                Copy Link
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Admin Notes</label>
        <div className="flex gap-2">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this order..."
            className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => onSaveNotes(order, notes)}
            className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
