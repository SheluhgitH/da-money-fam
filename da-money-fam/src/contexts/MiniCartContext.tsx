'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type MiniCartItem = {
  id: string
  kind: 'song' | 'merch'
  title: string
  priceLabel: string
  image?: string
  size?: string
  songId?: string
  merchId?: number
}

type MiniCartContextValue = {
  items: MiniCartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (item: MiniCartItem) => void
  removeItem: (id: string) => void
  clearCart: () => void
}

const MiniCartContext = createContext<MiniCartContextValue | null>(null)
const STORAGE_KEY = 'dmf-mini-cart'

export function MiniCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MiniCartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw) as MiniCartItem[])
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const addItem = useCallback((item: MiniCartItem) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === item.id)) return prev
      return [...prev, item]
    })
    setIsOpen(true)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toggleCart: () => setIsOpen((v) => !v),
      addItem,
      removeItem,
      clearCart,
    }),
    [items, isOpen, addItem, removeItem, clearCart]
  )

  return <MiniCartContext.Provider value={value}>{children}</MiniCartContext.Provider>
}

export function useMiniCart() {
  const ctx = useContext(MiniCartContext)
  if (!ctx) throw new Error('useMiniCart must be used within MiniCartProvider')
  return ctx
}
