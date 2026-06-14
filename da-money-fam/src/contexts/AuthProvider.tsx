'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    const { data: { session: s } } = await supabase.auth.getSession()
    setSession(s)
    setUser(s?.user ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    refreshSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase, refreshSession])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
