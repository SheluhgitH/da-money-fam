export type OrderStatus = 'pending' | 'verified' | 'delivered' | 'rejected'

export interface Song {
  id: string
  title: string
  artist: string
  album_cover_path: string
  mp3_file_path: string
  preview_path?: string
  price: number
  is_promoted: boolean
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
  genre?: string
  release_date?: string
  description?: string
  preview_available: boolean
  owned?: boolean
  is_favorited?: boolean
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

export interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
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
