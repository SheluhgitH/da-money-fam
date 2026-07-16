import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID, createHash, timingSafeEqual } from 'crypto'
import type { PaymentSettings, PurchaseOrder, MerchOrder, ServiceOrder, Song, PublicSong, UserProfile, UserStats } from '@/types/store'
import { createServiceClient } from '@/lib/supabase/server'
import { isMissingSupabaseTable } from '@/lib/supabase/errors'
import { getPrivateAudioDir, getContentType, uploadAudioToStorage } from '@/lib/audio'

const DATA_DIR = path.join(process.cwd(), 'data')

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const filePath = path.join(DATA_DIR, filename)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename)
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'EROFS' || code === 'EACCES' || code === 'ENOENT') {
      throw new Error(
        'Cannot save on production without Supabase tables. Run supabase/schema.sql in the Supabase SQL Editor, then npm run seed:songs.'
      )
    }
    throw error
  }
}

function mapSupabaseSong(row: Record<string, unknown>): Song {
  return {
    id: String(row.id),
    title: String(row.title),
    artist: String(row.artist),
    album_cover_path: String(row.album_cover_path),
    mp3_file_path: String(row.mp3_file_path),
    preview_path: row.preview_path ? String(row.preview_path) : undefined,
    price: Number(row.price),
    is_promoted: Boolean(row.is_promoted),
    for_sale: row.for_sale !== false,
    genre: row.genre ? String(row.genre) : undefined,
    release_date: row.release_date ? String(row.release_date) : undefined,
    description: row.description ? String(row.description) : undefined,
    is_published: Boolean(row.is_published ?? true),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapSupabaseOrder(row: Record<string, unknown>, songTitle?: string): PurchaseOrder {
  return {
    id: String(row.id),
    song_id: String(row.song_id),
    song_title: songTitle || String(row.song_title || 'Unknown'),
    buyer_email: String(row.buyer_email),
    buyer_name: String(row.buyer_name),
    payment_proof: String(row.payment_proof),
    payment_method: String(row.payment_method),
    status: row.status as PurchaseOrder['status'],
    download_token: row.download_token ? String(row.download_token) : null,
    stripe_session_id: row.stripe_session_id ? String(row.stripe_session_id) : undefined,
    admin_notes: row.admin_notes ? String(row.admin_notes) : undefined,
    user_id: row.user_id ? String(row.user_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function normalizeSong(song: Song): Song {
  return { ...song, for_sale: song.for_sale !== false }
}

export async function applyScheduledDropReleases(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    await supabase
      .from('songs')
      .update({ for_sale: true, updated_at: new Date().toISOString() })
      .eq('for_sale', false)
      .lte('release_date', today)
    return
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  let changed = false
  for (const song of songs) {
    if (song.for_sale === false && song.release_date && song.release_date <= today) {
      song.for_sale = true
      song.updated_at = new Date().toISOString()
      changed = true
    }
  }
  if (changed) await writeJsonFile('songs.json', songs)
}

export async function getPublishedSongs(): Promise<Song[]> {
  await applyScheduledDropReleases()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (!error && data?.length) return data.map(mapSupabaseSong)
    if (error && !isMissingSupabaseTable(error)) console.error('getPublishedSongs:', error.message)
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  return songs.filter((song) => song.is_published).map(normalizeSong)
}

export async function getAllSongs(): Promise<Song[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data?.length) return data.map(mapSupabaseSong)
    if (error && !isMissingSupabaseTable(error)) console.error('getAllSongs:', error.message)
  }

  return (await readJsonFile<Song[]>('songs.json', [])).map(normalizeSong)
}

export async function getSongById(id: string): Promise<Song | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!error && data) return mapSupabaseSong(data)
    if (error && !isMissingSupabaseTable(error)) console.error('getSongById:', error.message)
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  const found = songs.find((song) => song.id === id)
  return found ? normalizeSong(found) : null
}

export function toPublicSong(
  song: Song,
  options?: { owned?: boolean; is_favorited?: boolean }
): PublicSong {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album_cover_path: song.album_cover_path,
    price: song.price,
    is_promoted: song.is_promoted,
    for_sale: song.for_sale !== false,
    genre: song.genre,
    release_date: song.release_date,
    description: song.description,
    preview_available: Boolean(song.mp3_file_path),
    owned: options?.owned,
    is_favorited: options?.is_favorited,
  }
}

export async function createSong(input: Omit<Song, 'created_at' | 'updated_at'>): Promise<Song> {
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('songs')
      .insert({ ...input, created_at: now, updated_at: now })
      .select('*')
      .single()

    if (!error && data) return mapSupabaseSong(data)
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  const song: Song = { ...input, created_at: now, updated_at: now }
  songs.unshift(song)
  await writeJsonFile('songs.json', songs)
  return song
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song | null> {
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('songs')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select('*')
      .single()

    if (!error && data) return mapSupabaseSong(data)
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  const index = songs.findIndex((song) => song.id === id)
  if (index === -1) return null

  songs[index] = { ...songs[index], ...updates, updated_at: now }
  await writeJsonFile('songs.json', songs)
  return songs[index]
}

export async function deleteSong(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { error } = await supabase.from('songs').delete().eq('id', id)
    if (!error) return true
    if (!isMissingSupabaseTable(error)) return false
  }

  const songs = await readJsonFile<Song[]>('songs.json', [])
  const filtered = songs.filter((song) => song.id !== id)
  if (filtered.length === songs.length) return false
  await writeJsonFile('songs.json', filtered)
  return true
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const fallback: PaymentSettings = {
    paypal_email: 'damoneyfam@gmail.com',
    cashapp_tag: '$DaMoneyFam',
    venmo_handle: '@DaMoneyFam',
    contact_email: 'contact@damoneyfam.com',
    instructions:
      'Send payment via PayPal Friends & Family, CashApp, or Venmo. Include the song title in your payment note, then submit your proof below.',
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (!error && data) {
      return {
        paypal_email: String(data.paypal_email),
        cashapp_tag: String(data.cashapp_tag),
        venmo_handle: String(data.venmo_handle),
        contact_email: String(data.contact_email),
        instructions: String(data.instructions),
      }
    }
  }

  return readJsonFile<PaymentSettings>('payment-settings.json', fallback)
}

export async function updatePaymentSettings(settings: PaymentSettings): Promise<PaymentSettings> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { error } = await supabase
      .from('payment_settings')
      .upsert({ id: 1, ...settings })

    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
    if (!error) return settings
  }

  await writeJsonFile('payment-settings.json', settings)
  return settings
}

export async function getAllOrders(): Promise<PurchaseOrder[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, songs(title)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      return data.map((row: Record<string, unknown>) => {
        const songs = row.songs as { title?: string } | null
        return mapSupabaseOrder(row, songs?.title)
      })
    }
  }

  return readJsonFile<PurchaseOrder[]>('orders.json', [])
}

export async function createOrder(input: {
  song_id: string
  buyer_email: string
  buyer_name: string
  payment_proof: string
  payment_method: string
}): Promise<PurchaseOrder> {
  const song = await getSongById(input.song_id)
  if (!song || !song.is_published) throw new Error('Song not found')

  const now = new Date().toISOString()
  const order: PurchaseOrder = {
    id: randomUUID(),
    song_id: input.song_id,
    song_title: song.title,
    buyer_email: input.buyer_email,
    buyer_name: input.buyer_name,
    payment_proof: input.payment_proof,
    payment_method: input.payment_method,
    status: 'pending',
    download_token: null,
    created_at: now,
    updated_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        song_id: input.song_id,
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name,
        payment_proof: input.payment_proof,
        payment_method: input.payment_method,
        status: 'pending',
      })
      .select('*')
      .single()

    if (!error && data) return mapSupabaseOrder(data, song.title)
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const orders = await readJsonFile<PurchaseOrder[]>('orders.json', [])
  orders.unshift(order)
  await writeJsonFile('orders.json', orders)
  return order
}

export async function updateOrder(
  id: string,
  updates: Partial<PurchaseOrder>
): Promise<PurchaseOrder | null> {
  const now = new Date().toISOString()

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select('*')
      .single()

    if (!error && data) {
      const song = await getSongById(String(data.song_id))
      return mapSupabaseOrder(data, song?.title)
    }
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const orders = await readJsonFile<PurchaseOrder[]>('orders.json', [])
  const index = orders.findIndex((order) => order.id === id)
  if (index === -1) return null

  orders[index] = { ...orders[index], ...updates, updated_at: now }
  await writeJsonFile('orders.json', orders)
  return orders[index]
}

export async function getOrderByToken(token: string): Promise<PurchaseOrder | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('download_token', token)
      .in('status', ['verified', 'delivered'])
      .maybeSingle()

    if (!error && data) return mapSupabaseOrder(data)
  }

  const orders = await readJsonFile<PurchaseOrder[]>('orders.json', [])
  return (
    orders.find(
      (order) =>
        order.download_token === token &&
        (order.status === 'verified' || order.status === 'delivered')
    ) || null
  )
}

export async function getOrderByStripeSession(sessionId: string): Promise<PurchaseOrder | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (!error && data) return mapSupabaseOrder(data)
  }

  const orders = await readJsonFile<PurchaseOrder[]>('orders.json', [])
  return orders.find((order) => order.stripe_session_id === sessionId) || null
}

export async function createStripeOrder(input: {
  song_id: string
  song_title: string
  buyer_email: string
  buyer_name: string
  stripe_session_id: string
  download_token: string
  user_id?: string | null
}): Promise<PurchaseOrder> {
  const now = new Date().toISOString()
  const order: PurchaseOrder = {
    id: randomUUID(),
    song_id: input.song_id,
    song_title: input.song_title,
    buyer_email: input.buyer_email,
    buyer_name: input.buyer_name,
    payment_proof: input.stripe_session_id,
    payment_method: 'stripe',
    status: 'delivered',
    download_token: input.download_token,
    stripe_session_id: input.stripe_session_id,
    user_id: input.user_id ?? null,
    created_at: now,
    updated_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        song_id: input.song_id,
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name,
        payment_proof: input.stripe_session_id,
        payment_method: 'stripe',
        status: 'delivered',
        download_token: input.download_token,
        stripe_session_id: input.stripe_session_id,
        user_id: input.user_id ?? null,
      })
      .select('*')
      .single()

    if (!error && data) return mapSupabaseOrder(data, input.song_title)
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const orders = await readJsonFile<PurchaseOrder[]>('orders.json', [])
  orders.unshift(order)
  await writeJsonFile('orders.json', orders)
  return order
}

export function generateDownloadToken(): string {
  return createHash('sha256').update(randomUUID() + Date.now()).digest('hex')
}

export async function getMerchOrderByStripeSession(sessionId: string): Promise<MerchOrder | null> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data } = await supabase
      .from('merch_orders')
      .select('*')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()
    if (data) {
      return {
        id: String(data.id),
        merch_id: String(data.merch_id),
        merch_name: String(data.merch_name),
        price: Number(data.price),
        size: data.size ? String(data.size) : null,
        shipping_address: data.shipping_address ? String(data.shipping_address) : null,
        buyer_email: String(data.buyer_email),
        buyer_name: String(data.buyer_name),
        stripe_session_id: String(data.stripe_session_id),
        user_id: data.user_id ? String(data.user_id) : null,
        status: 'paid',
        created_at: String(data.created_at),
      }
    }
  }

  const orders = await readJsonFile<MerchOrder[]>('merch-orders.json', [])
  return orders.find((order) => order.stripe_session_id === sessionId) || null
}

export async function getAllMerchOrders(): Promise<MerchOrder[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('merch_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      return data.map((row) => ({
        id: String(row.id),
        merch_id: String(row.merch_id),
        merch_name: String(row.merch_name),
        price: Number(row.price),
        size: row.size ? String(row.size) : null,
        shipping_address: row.shipping_address ? String(row.shipping_address) : null,
        buyer_email: String(row.buyer_email),
        buyer_name: String(row.buyer_name),
        stripe_session_id: String(row.stripe_session_id),
        user_id: row.user_id ? String(row.user_id) : null,
        status: 'paid' as const,
        created_at: String(row.created_at),
      }))
    }
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  return readJsonFile<MerchOrder[]>('merch-orders.json', [])
}

export async function createMerchOrder(input: {
  merch_id: string
  merch_name: string
  price: number
  size?: string | null
  shipping_address?: string | null
  buyer_email: string
  buyer_name: string
  stripe_session_id: string
  user_id?: string | null
}): Promise<MerchOrder> {
  const now = new Date().toISOString()
  const order: MerchOrder = {
    id: randomUUID(),
    merch_id: input.merch_id,
    merch_name: input.merch_name,
    price: input.price,
    size: input.size ?? null,
    shipping_address: input.shipping_address ?? null,
    buyer_email: input.buyer_email,
    buyer_name: input.buyer_name,
    stripe_session_id: input.stripe_session_id,
    user_id: input.user_id ?? null,
    status: 'paid',
    created_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('merch_orders')
      .insert({
        merch_id: input.merch_id,
        merch_name: input.merch_name,
        price: input.price,
        size: input.size ?? null,
        shipping_address: input.shipping_address ?? null,
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name,
        stripe_session_id: input.stripe_session_id,
        user_id: input.user_id ?? null,
        status: 'paid',
      })
      .select('*')
      .single()

    if (!error && data) {
      return {
        id: String(data.id),
        merch_id: String(data.merch_id),
        merch_name: String(data.merch_name),
        price: Number(data.price),
        size: data.size ? String(data.size) : null,
        shipping_address: data.shipping_address ? String(data.shipping_address) : null,
        buyer_email: String(data.buyer_email),
        buyer_name: String(data.buyer_name),
        stripe_session_id: String(data.stripe_session_id),
        user_id: data.user_id ? String(data.user_id) : null,
        status: 'paid',
        created_at: String(data.created_at),
      }
    }
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const orders = await readJsonFile<MerchOrder[]>('merch-orders.json', [])
  orders.unshift(order)
  await writeJsonFile('merch-orders.json', orders)
  return order
}

export async function getAllServiceOrders(): Promise<ServiceOrder[]> {
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      return data.map((row) => ({
        id: String(row.id),
        package_slug: String(row.package_slug),
        package_name: String(row.package_name),
        deposit_amount: Number(row.deposit_amount),
        buyer_email: String(row.buyer_email),
        buyer_name: String(row.buyer_name),
        stripe_session_id: String(row.stripe_session_id),
        user_id: row.user_id ? String(row.user_id) : null,
        status: 'deposit_paid' as const,
        created_at: String(row.created_at),
      }))
    }
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }
  return readJsonFile<ServiceOrder[]>('service-orders.json', [])
}

export async function createServiceOrder(input: {
  package_slug: string
  package_name: string
  deposit_amount: number
  buyer_email: string
  buyer_name: string
  stripe_session_id: string
  user_id?: string | null
}): Promise<ServiceOrder> {
  const now = new Date().toISOString()
  const order: ServiceOrder = {
    id: randomUUID(),
    package_slug: input.package_slug,
    package_name: input.package_name,
    deposit_amount: input.deposit_amount,
    buyer_email: input.buyer_email,
    buyer_name: input.buyer_name,
    stripe_session_id: input.stripe_session_id,
    user_id: input.user_id ?? null,
    status: 'deposit_paid',
    created_at: now,
  }

  if (isSupabaseConfigured()) {
    const supabase = createServiceClient()!
    const { data, error } = await supabase
      .from('service_orders')
      .insert({
        package_slug: input.package_slug,
        package_name: input.package_name,
        deposit_amount: input.deposit_amount,
        buyer_email: input.buyer_email,
        buyer_name: input.buyer_name,
        stripe_session_id: input.stripe_session_id,
        user_id: input.user_id ?? null,
        status: 'deposit_paid',
      })
      .select('*')
      .single()
    if (!error && data) {
      return {
        id: String(data.id),
        package_slug: String(data.package_slug),
        package_name: String(data.package_name),
        deposit_amount: Number(data.deposit_amount),
        buyer_email: String(data.buyer_email),
        buyer_name: String(data.buyer_name),
        stripe_session_id: String(data.stripe_session_id),
        user_id: data.user_id ? String(data.user_id) : null,
        status: 'deposit_paid',
        created_at: String(data.created_at),
      }
    }
    if (error && !isMissingSupabaseTable(error)) throw new Error(error.message)
  }

  const orders = await readJsonFile<ServiceOrder[]>('service-orders.json', [])
  orders.unshift(order)
  await writeJsonFile('service-orders.json', orders)
  return order
}

export async function saveUploadedFile(
  file: File,
  folder: 'audio' | 'covers'
): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_')
  const filename = `${Date.now()}-${safeName}`

  if (folder === 'audio') {
    const absolutePath = path.join(getPrivateAudioDir(), filename)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, buffer)
    await uploadAudioToStorage(filename, buffer, getContentType(filename))
    return `private-audio/${filename}`
  }

  const relativePath = `/store/${folder}/${filename}`
  const absolutePath = path.join(process.cwd(), 'public', 'store', folder, filename)

  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, buffer)

  return relativePath
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || 'dmf-admin-2026'
  const inputHash = createHash('sha256').update(password).digest()
  const expectedHash = createHash('sha256').update(adminPassword).digest()

  try {
    return timingSafeEqual(inputHash, expectedHash)
  } catch {
    return false
  }
}

export function createAdminSessionToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || 'dmf-session-secret'
  return createHash('sha256')
    .update(`${secret}:${Date.now()}:${randomUUID()}`)
    .digest('hex')
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) return false
  return token.length === 64 && /^[a-f0-9]+$/.test(token)
}
