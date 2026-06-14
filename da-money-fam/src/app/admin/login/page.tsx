'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Login failed')
      }

      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-matte-black flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md glass-gold rounded-2xl p-8">
        <h1 className="font-serif text-3xl gold-gradient mb-2">DMF Admin</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in to manage songs and orders</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white mb-4"
          required
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-black font-bold py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
