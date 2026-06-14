import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}
