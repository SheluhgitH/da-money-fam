'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthProvider'
import { PublicSong } from '@/types/store'

interface SongBiddingProps {
  onBidSuccess: () => void
}

export default function SongBidding({ onBidSuccess }: SongBiddingProps) {
  const { user, loading: authLoading } = useAuth()
  const [biddingState, setBiddingState] = useState<{
    current_song: PublicSong | null
    bidding_active: boolean
    bidding_ends_at: number | null
    bids: { song_id: string; amount: number }[]
    all_songs: PublicSong[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState(1)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [userCoins, setUserCoins] = useState(0)

  const fetchBiddingState = async () => {
    try {
      const res = await fetch('/api/bidding')
      const data = await res.json()
      if (res.ok) {
        console.log('SongBidding: fetched bidding state', data)
        setBiddingState(data)
        if (user) {
          const coinRes = await fetch('/api/user/coins')
          const coinData = await coinRes.json()
          if (coinRes.ok) {
            console.log('SongBidding: fetched user coins', coinData.coins)
            setUserCoins(coinData.coins)
          }
        }
      } else {
        setError(data.error || 'Failed to fetch bidding state')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bidding state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBiddingState()
    const interval = setInterval(fetchBiddingState, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [user])

  const handlePlaceBid = async () => {
    console.log('SongBidding: placing bid', { selectedSongId, bidAmount, userCoins })
    if (!user) {
      setError('Please sign in to place a bid.')
      return
    }
    if (!selectedSongId) {
      setError('Please select a song to bid on.')
      return
    }
    if (bidAmount > userCoins) {
      setError('Insufficient Coinz.')
      return
    }
    if (bidAmount <= 0) {
      setError('Bid amount must be positive.')
      return
    }

    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch('/api/bidding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: selectedSongId, amount: bidAmount }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place bid')
      }

      console.log('SongBidding: bid placed successfully', data)
      setSuccessMessage(`Bid of ${bidAmount} Coinz placed on ${biddingState?.all_songs.find(s => s.id === selectedSongId)?.title || 'selected song'}!`)
      setUserCoins(data.newBalance)
      onBidSuccess() // Notify parent component (MusicPlayer) to refresh
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid')
    }
  }

  const timeRemaining = biddingState?.bidding_ends_at ? Math.max(0, Math.floor((biddingState.bidding_ends_at - Date.now()) / 1000)) : 0

  if (authLoading || loading) {
    return (
      <div className="text-center text-gray-500 py-8">Loading bidding details...</div>
    )
  }

  const currentLeader = biddingState?.bids.sort((a, b) => b.amount - a.amount)[0]
  const winningSong = currentLeader ? biddingState?.all_songs.find(s => s.id === currentLeader.song_id) : null

  return (
    <div className="glass-gold rounded-2xl p-6 text-white text-center">
      <h3 className="font-serif text-2xl gold-gradient mb-4">Next Song Bid</h3>
      {biddingState?.bidding_active ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Current Song: {biddingState.current_song?.title || 'None'}</p>
          <p className="text-lg font-bold">Bidding ends in: <span className="text-gold">{timeRemaining}s</span></p>
          {winningSong && (
            <p className="text-sm text-gray-300">
              Winning: <span className="text-gold font-bold">{winningSong.title}</span> with {currentLeader?.amount} Coinz
            </p>
          )}
          <hr className="border-white/10" />
          <p className="text-gold text-sm font-bold">Your Coinz: {userCoins}</p>
          <div className="flex flex-col gap-3">
            <select
              value={selectedSongId || ''}
              onChange={(e) => setSelectedSongId(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/50"
            >
              <option value="" disabled>Select a song to bid on</option>
              {biddingState.all_songs.map(song => (
                <option key={song.id} value={song.id}>{song.title} (${song.price.toFixed(2)})</option>
              ))}
            </select>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                setBidAmount(Number.isFinite(value) ? value : 0)
              }}
              min="1"
              max={userCoins}
              placeholder="Bid amount (Coinz)"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gold/50"
            />
            <button
              onClick={handlePlaceBid}
              className="w-full bg-gold text-black font-bold py-3 rounded-full uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
              disabled={!user || !selectedSongId || bidAmount <= 0 || bidAmount > userCoins}
            >
              Place Bid
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          {successMessage && <p className="text-green-400 text-sm mt-2">{successMessage}</p>}
        </div>
      ) : (
        <p className="text-gray-400">Bidding is currently inactive. Please wait for the next round.</p>
      )}
    </div>
  )
}
