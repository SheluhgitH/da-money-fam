export type OrderStatus = 'pending' | 'verified' | 'delivered' | 'rejected'

export type SongAccess = 'public' | 'early' | 'exclusive'

export interface Song {
  id: string
  title: string
  artist: string
  album_cover_path: string
  mp3_file_path: string
  preview_path?: string
  /** Seconds from track start where the public preview begins. */
  preview_start_sec?: number
  /** Full track length in seconds (from browser decode); improves byte-offset accuracy. */
  track_duration_sec?: number
  price: number
  is_promoted: boolean
  for_sale: boolean
  access: SongAccess
  genre?: string
  release_date?: string
  description?: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface PublicSong {
  id: string
  title: string
  artist: string
  album_cover_path: string
  price: number
  is_promoted: boolean
  for_sale: boolean
  access: SongAccess
  genre?: string
  release_date?: string
  description?: string
  preview_available: boolean
  owned?: boolean
  is_favorited?: boolean
  comment_count?: number
  favorite_count?: number
}

export interface SongComment {
  id: string
  song_id: string
  user_id: string
  comment_text: string
  created_at: string
  display_name: string | null
  avatar_url: string | null
  level?: number
  priority?: boolean
  fan_club?: boolean
  active_cosmetics?: string[]
}

export interface UserCosmetic {
  id: string
  user_id: string
  cosmetic_slug: string
  enabled: boolean
  revealed_at: string | null
  granted_at: string
  granted_by: string | null
  admin_note: string | null
  gift_message: string | null
}

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  active_cosmetics?: string[]
}

export interface PurchaseOrder {
  id: string
  song_id: string
  song_title: string
  buyer_email: string
  buyer_name: string
  payment_proof: string
  payment_method: string
  status: OrderStatus
  download_token: string | null
  stripe_session_id?: string
  admin_notes?: string
  user_id?: string | null
  created_at: string
  updated_at: string
}

export type MerchOrderStatus = 'paid' | 'packing' | 'shipped' | 'fulfilled' | 'rejected'
export type ServiceOrderStatus = 'deposit_paid' | 'in_progress' | 'completed' | 'cancelled'

export interface MerchOrder {
  id: string
  merch_id: string
  merch_name: string
  price: number
  size?: string | null
  shipping_address?: string | null
  buyer_email: string
  buyer_name: string
  stripe_session_id: string
  user_id?: string | null
  status: MerchOrderStatus
  admin_notes?: string | null
  created_at: string
}

export interface ServiceOrder {
  id: string
  package_slug: string
  package_name: string
  deposit_amount: number
  buyer_email: string
  buyer_name: string
  stripe_session_id: string
  user_id?: string | null
  status: ServiceOrderStatus
  admin_notes?: string | null
  created_at: string
}

export interface PaymentSettings {
  paypal_email: string
  cashapp_tag: string
  venmo_handle: string
  contact_email: string
  instructions: string
}

export interface StoreData {
  songs: Song[]
  orders: PurchaseOrder[]
  payment_settings: PaymentSettings
}

export interface UserStats {
  user_id: string
  xp: number
  level: number
  streak: number
  last_login: string | null
}

export interface LibraryItem {
  order_id: string
  song_id: string
  song_title: string
  album_cover_path: string
  download_token: string | null
  purchased_at: string
}
