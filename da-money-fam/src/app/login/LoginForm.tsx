'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      setError('Supabase environment variables are not configured. Please check your .env.local file.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    if (!supabase) {
      setError('Supabase client could not be initialized.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleOAuth = async (provider: 'google') => {
    if (!isSupabaseConfigured()) {
      setError('Supabase environment variables are not configured. Please check your .env.local file.')
      setLoading(false)
      return
    }

    if (!supabase) {
      setError('Supabase client could not be initialized.')
      return
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-matte-black flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-gold rounded-2xl p-8">
        <h1 className="font-serif text-3xl gold-gradient mb-2">Welcome Back</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in for your library, favorites, and fan stats</p>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-black font-bold py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-500 uppercase">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="w-full border border-white/20 text-white font-bold py-3 rounded-full uppercase tracking-wider text-xs hover:border-gold hover:text-gold transition-colors"
        >
          Continue with Google
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{' '}
          <Link href={`/signup?redirect=${encodeURIComponent(redirect)}`} className="text-gold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
