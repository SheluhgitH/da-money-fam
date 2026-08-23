'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { OrderStatus, PaymentSettings, PurchaseOrder, MerchOrder, MerchOrderStatus, ServiceOrder, ServiceOrderStatus, Song } from '@/types/store'
import NewSongForm from './NewSongForm'
import EditSongForm from './EditSongForm'
import AdStudioAdmin from './AdStudioAdmin'
import SiteSettingsPanel from './SiteSettingsPanel'
import UsersAdmin from './UsersAdmin'
import ActivityLogPanel from './ActivityLogPanel'
import BlogAdminPanel from './BlogAdminPanel'

type Tab =
  | 'overview'
  | 'ad-studio'
  | 'users'
  | 'site'
  | 'songs'
  | 'orders'
  | 'merch'
  | 'services'
  | 'settings'
  | 'activity'
  | 'blog'
  | 'new'
  | 'edit'
type OrderFilter = 'all' | OrderStatus

type ImageTierStat = {
  tier: string
  label: string
  gens: number
  avgUsdCost: number
  avgRealRevenueUsd: number
  impliedMargin: number | null
  overBuffer: boolean
}

type OverviewPayload = {
  usersTotal: number
  signupsWeek: number
  coinzSoldApprox: number
  fetchedAt: string
  adStudio: {
    video: {
      today: number
      week: number
      coinzToday: number
      coinzWeek: number
      failedToday: number
      failRate: number
    }
    image: {
      today: number
      week: number
      coinzToday: number
      coinzWeek: number
      costUsdWeek: number
      tiers: ImageTierStat[]
    }
  }
  recentVideos: Array<{
    id: string
    brief: string | null
    status: string
    coinz_spent: number
    created_at: string
    mode: string
  }>
  recentImages: Array<{
    id: string
    prompt: string | null
    model: string
    coinz_spent: number
    usd_cost: number | null
    created_at: string
  }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPreviewStart(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs uppercase tracking-widest text-gold mb-3">{children}</h3>
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
  const [studioFilter, setStudioFilter] = useState('')
  const [overview, setOverview] = useState<OverviewPayload | null>(null)
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    setMessage('')
    try {
      const [songsRes, ordersRes, merchRes, serviceRes, settingsRes, overviewRes] =
        await Promise.all([
          fetch('/api/admin/songs'),
          fetch('/api/admin/orders'),
          fetch('/api/admin/merch-orders'),
          fetch('/api/admin/service-orders'),
          fetch('/api/admin/payment-settings'),
          fetch('/api/admin/overview'),
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
      const overviewData = overviewRes.ok ? await overviewRes.json() : null

      if (!songsRes.ok) {
        setMessage(songsData.error || 'Failed to load songs')
      }

      setSongs(songsData.songs || [])
      setOrders(ordersData.orders || [])
      setMerchOrders(merchData.orders || [])
      setServiceOrders(serviceData.orders || [])
      setSettings(settingsData.settings || null)
      setOverview(
        overviewData
          ? {
              usersTotal: overviewData.usersTotal || 0,
              signupsWeek: overviewData.signupsWeek || 0,
              coinzSoldApprox: overviewData.coinzSoldApprox || 0,
              fetchedAt: overviewData.fetchedAt || new Date().toISOString(),
              adStudio: overviewData.adStudio || {
                video: {
                  today: 0,
                  week: 0,
                  coinzToday: 0,
                  coinzWeek: 0,
                  failedToday: 0,
                  failRate: 0,
                },
                image: {
                  today: 0,
                  week: 0,
                  coinzToday: 0,
                  coinzWeek: 0,
                  costUsdWeek: 0,
                  tiers: [],
                },
              },
              recentVideos: overviewData.recentVideos || [],
              recentImages: overviewData.recentImages || [],
            }
          : null
      )
    } catch (error) {
      console.error(error)
      setMessage('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section') as Tab | null
    if (
      section &&
      ['overview', 'ad-studio', 'users', 'site', 'songs', 'orders', 'merch', 'services', 'settings', 'activity', 'blog', 'new'].includes(
        section
      )
    ) {
      setTab(section)
    }
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
    const url = new URL(window.location.href)
    url.searchParams.set('section', next === 'edit' ? 'songs' : next)
    window.history.replaceState({}, '', url.toString())
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

  const updateMerch = async (order: MerchOrder, status: MerchOrderStatus, sendEmail = false) => {
    const res = await fetch('/api/admin/merch-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status, admin_notes: order.admin_notes, send_email: sendEmail }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage(`Merch order ${status}`)
      loadData()
    } else {
      setMessage(data.error || 'Failed to update merch order')
    }
  }

  const saveMerchNotes = async (order: MerchOrder, notes: string) => {
    const res = await fetch('/api/admin/merch-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, admin_notes: notes }),
    })
    if (res.ok) {
      setMessage('Merch notes saved')
      loadData()
    }
  }

  const updateService = async (order: ServiceOrder, status: ServiceOrderStatus, sendEmail = false) => {
    const res = await fetch('/api/admin/service-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status, admin_notes: order.admin_notes, send_email: sendEmail }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage(`Service order ${status}`)
      loadData()
    } else {
      setMessage(data.error || 'Failed to update service order')
    }
  }

  const saveServiceNotes = async (order: ServiceOrder, notes: string) => {
    const res = await fetch('/api/admin/service-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, admin_notes: notes }),
    })
    if (res.ok) {
      setMessage('Service notes saved')
      loadData()
    }
  }

  const sendThankYou = async (
    kind: 'song' | 'merch' | 'service',
    id: string
  ) => {
    const path =
      kind === 'song'
        ? '/api/admin/orders/thank-you'
        : kind === 'merch'
          ? '/api/admin/merch-orders/thank-you'
          : '/api/admin/service-orders/thank-you'
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setMessage('Thank you email sent')
    } else {
      setMessage(data.error || 'Failed to send thank you email')
    }
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
    { id: 'ad-studio', label: 'Ad Studio' },
    { id: 'users', label: 'Users' },
    { id: 'site', label: 'Site' },
    { id: 'songs', label: 'Songs' },
    { id: 'orders', label: 'Song Orders' },
    { id: 'merch', label: 'Merch Orders' },
    { id: 'services', label: 'Service Orders' },
    { id: 'blog', label: 'Blog' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Payment' },
    { id: 'new', label: 'Add Song' },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="lg:w-56 shrink-0">
        <nav className="flex lg:flex-col flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm uppercase tracking-wider transition-colors text-left ${
              tab === t.id || (tab === 'edit' && t.id === 'songs')
                ? 'bg-gold text-black'
                : 'bg-white/5 text-gray-300 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">

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

      {tab === 'ad-studio' ? (
        <AdStudioAdmin initialStatus={studioFilter} />
      ) : tab === 'users' ? (
        <UsersAdmin />
      ) : tab === 'site' ? (
        <SiteSettingsPanel />
      ) : tab === 'activity' ? (
        <ActivityLogPanel />
      ) : tab === 'blog' ? (
        <BlogAdminPanel />
      ) : loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : tab === 'overview' ? (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {overview?.fetchedAt
                ? `Updated ${formatDate(overview.fetchedAt)}`
                : 'Stats not loaded'}
            </p>
            <button
              type="button"
              onClick={() => loadData()}
              className="text-xs px-3 py-1.5 rounded-full border border-gold/40 text-gold hover:bg-gold/10"
            >
              Refresh
            </button>
          </div>

          <div>
            <SectionLabel>Store</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard label="Total Songs" value={songs.length} hint={`${stats.published} published`} />
              <StatCard label="Promoted" value={stats.promoted} hint="Shown on homepage" />
              <StatCard label="Pending Orders" value={stats.pending} hint="Awaiting verification" />
              <StatCard label="Est. Revenue" value={`$${stats.revenue.toFixed(2)}`} hint={`${stats.delivered} delivered`} />
              <StatCard label="Merch Orders" value={stats.merchCount} hint={`$${stats.merchRevenue.toFixed(2)} merch`} />
              <StatCard label="Service Deposits" value={stats.serviceCount} hint={`$${stats.serviceRevenue.toFixed(2)} deposits`} />
            </div>
          </div>

          <div>
            <SectionLabel>Ad Studio — Video</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Video gens today"
                value={overview?.adStudio.video.today ?? 0}
                hint={`${overview?.adStudio.video.week ?? 0} this week`}
              />
              <StatCard
                label="Coinz today"
                value={overview?.adStudio.video.coinzToday ?? 0}
                hint={`${overview?.adStudio.video.coinzWeek ?? 0} coinz (7d)`}
              />
              <StatCard
                label="Failed today"
                value={overview?.adStudio.video.failedToday ?? 0}
                hint={`${overview?.adStudio.video.failRate ?? 0}% fail rate`}
              />
              <StatCard
                label="Fail rate"
                value={`${overview?.adStudio.video.failRate ?? 0}%`}
                hint="Today"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Ad Studio — Images</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <StatCard
                label="Image gens today"
                value={overview?.adStudio.image.today ?? 0}
                hint={`${overview?.adStudio.image.week ?? 0} this week`}
              />
              <StatCard
                label="Coinz today"
                value={overview?.adStudio.image.coinzToday ?? 0}
                hint={`${overview?.adStudio.image.coinzWeek ?? 0} coinz (7d)`}
              />
              <StatCard
                label="Gens (7d)"
                value={overview?.adStudio.image.week ?? 0}
                hint="All image tiers"
              />
              <StatCard
                label="Est. cost (7d)"
                value={`$${(overview?.adStudio.image.costUsdWeek ?? 0).toFixed(2)}`}
                hint="Provider USD"
              />
            </div>
            {(overview?.adStudio.image.tiers?.length ?? 0) > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {overview!.adStudio.image.tiers.map((t) => (
                  <div
                    key={t.tier}
                    className={`rounded-lg p-3 bg-black/40 border ${
                      t.overBuffer ? 'border-red-400/50' : 'border-white/10'
                    }`}
                  >
                    <p className="text-[10px] uppercase text-gray-500">{t.label}</p>
                    <p className="text-sm text-white mt-1">
                      {t.gens} gens · margin{' '}
                      {t.impliedMargin != null ? `${t.impliedMargin}%` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      cost ${t.avgUsdCost} · rev ${t.avgRealRevenueUsd}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Community</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Users"
                value={overview?.usersTotal ?? 0}
                hint={`${overview?.signupsWeek ?? 0} new this week`}
              />
              <StatCard
                label="Coinz granted (7d)"
                value={overview?.coinzSoldApprox ?? 0}
                hint="From purchase ledger entries"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6">
              <h3 className="font-serif text-xl text-white mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setStudioFilter('')
                    switchTab('ad-studio')
                  }}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                >
                  Ad Studio
                </button>
                <button
                  onClick={() => {
                    setStudioFilter('failed')
                    switchTab('ad-studio')
                  }}
                  className="px-4 py-2 rounded-full bg-red-500/20 text-red-200 text-sm hover:bg-red-500/30"
                >
                  Failed video gens
                </button>
                <button
                  onClick={() => switchTab('users')}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                >
                  Manage Users
                </button>
                <button
                  onClick={() => switchTab('site')}
                  className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                >
                  Site settings
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

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-white">Recent video gens</h3>
                <button
                  type="button"
                  onClick={() => {
                    setStudioFilter('')
                    switchTab('ad-studio')
                  }}
                  className="text-xs text-gold hover:underline"
                >
                  View all
                </button>
              </div>
              {(overview?.recentVideos?.length ?? 0) === 0 ? (
                <p className="text-gray-500 text-sm">No video generations yet.</p>
              ) : (
                <ul className="space-y-3">
                  {overview!.recentVideos.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-white truncate">{item.brief || 'Untitled'}</p>
                        <p className="text-gray-500 text-xs">
                          {item.status} · {item.mode} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-gold shrink-0 font-mono">{item.coinz_spent}c</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-white">Recent image gens</h3>
                <button
                  type="button"
                  onClick={() => {
                    setStudioFilter('')
                    switchTab('ad-studio')
                  }}
                  className="text-xs text-gold hover:underline"
                >
                  View all
                </button>
              </div>
              {(overview?.recentImages?.length ?? 0) === 0 ? (
                <p className="text-gray-500 text-sm">No image generations yet.</p>
              ) : (
                <ul className="space-y-3">
                  {overview!.recentImages.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-white truncate">{item.prompt || item.model || 'Image'}</p>
                        <p className="text-gray-500 text-xs">
                          {item.model} · {formatDate(item.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-gold shrink-0 font-mono">{item.coinz_spent}c</span>
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
                    {(song.preview_start_sec ?? 0) > 0 &&
                      ` · preview @ ${formatPreviewStart(song.preview_start_sec ?? 0)}`}
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
              <CommerceOrderCard
                key={order.id}
                title={order.merch_name}
                subtitle={`${order.buyer_name} · ${order.buyer_email}`}
                extra={order.size ? `Size: ${order.size}` : undefined}
                address={order.shipping_address}
                createdAt={order.created_at}
                amount={`$${order.price.toFixed(2)}`}
                status={order.status}
                notes={order.admin_notes || ''}
                statuses={['paid', 'packing', 'shipped', 'fulfilled', 'rejected']}
                onStatus={(status, email) => updateMerch(order, status as MerchOrderStatus, email)}
                onSaveNotes={(notes) => saveMerchNotes(order, notes)}
                onThankYou={() => sendThankYou('merch', order.id)}
              />
            ))
          )}
        </div>
      ) : tab === 'services' ? (
        <div className="space-y-4">
          {serviceOrders.length === 0 ? (
            <p className="text-gray-500">No service deposits yet.</p>
          ) : (
            serviceOrders.map((order) => (
              <CommerceOrderCard
                key={order.id}
                title={order.package_name}
                subtitle={`${order.buyer_name} · ${order.buyer_email}`}
                createdAt={order.created_at}
                amount={`$${order.deposit_amount.toFixed(2)}`}
                status={order.status}
                notes={order.admin_notes || ''}
                statuses={['deposit_paid', 'in_progress', 'completed', 'cancelled']}
                onStatus={(status, email) => updateService(order, status as ServiceOrderStatus, email)}
                onSaveNotes={(notes) => saveServiceNotes(order, notes)}
                onThankYou={() => sendThankYou('service', order.id)}
              />
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
                onThankYou={() => sendThankYou('song', order.id)}
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
    </div>
  )
}

function OrderCard({
  order,
  onUpdate,
  onSaveNotes,
  onCopyLink,
  onThankYou,
}: {
  order: PurchaseOrder
  onUpdate: (order: PurchaseOrder, status: PurchaseOrder['status'], sendEmail?: boolean, adminNotes?: string) => void
  onSaveNotes: (order: PurchaseOrder, notes: string) => void
  onCopyLink: (token: string) => void
  onThankYou: () => void | Promise<void>
}) {
  const [notes, setNotes] = useState(order.admin_notes || '')
  const [thankYouLoading, setThankYouLoading] = useState(false)

  const handleThankYou = async () => {
    setThankYouLoading(true)
    try {
      await onThankYou()
    } finally {
      setThankYouLoading(false)
    }
  }

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
          {order.buyer_email && (
            <button
              type="button"
              onClick={handleThankYou}
              disabled={thankYouLoading}
              className="text-xs px-3 py-2 rounded-full border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-50"
            >
              {thankYouLoading ? 'Sending…' : 'Send Thank You'}
            </button>
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

function CommerceOrderCard({
  title,
  subtitle,
  extra,
  address,
  createdAt,
  amount,
  status,
  notes: initialNotes,
  statuses,
  onStatus,
  onSaveNotes,
  onThankYou,
}: {
  title: string
  subtitle: string
  extra?: string
  address?: string | null
  createdAt: string
  amount: string
  status: string
  notes: string
  statuses: string[]
  onStatus: (status: string, sendEmail: boolean) => void
  onSaveNotes: (notes: string) => void
  onThankYou: () => void | Promise<void>
}) {
  const [notes, setNotes] = useState(initialNotes)
  const [thankYouLoading, setThankYouLoading] = useState(false)

  const handleThankYou = async () => {
    setThankYouLoading(true)
    try {
      await onThankYou()
    } finally {
      setThankYouLoading(false)
    }
  }

  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-bold">{title}</h3>
          <p className="text-sm text-gray-400">{subtitle}</p>
          {extra && <p className="text-xs text-gold mt-1 uppercase tracking-wider">{extra}</p>}
          <p className="text-xs text-gray-500 mt-1">{formatDate(createdAt)}</p>
          {address && (
            <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">Ship to: {address}</p>
          )}
          <p className="text-xs text-gold mt-2 uppercase tracking-wider">{status.replace('_', ' ')}</p>
        </div>
        <p className="text-gold font-mono text-lg shrink-0">{amount}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatus(s, false)}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full ${
              status === s ? 'bg-gold text-black' : 'bg-white/10 text-gray-300'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onStatus(status, true)}
          className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-200"
        >
          Email buyer
        </button>
        <button
          type="button"
          onClick={handleThankYou}
          disabled={thankYouLoading}
          className="text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-gold/50 text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {thankYouLoading ? 'Sending…' : 'Send Thank You'}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes"
          className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => onSaveNotes(notes)}
          className="text-xs px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0"
        >
          Save
        </button>
      </div>
    </div>
  )
}
