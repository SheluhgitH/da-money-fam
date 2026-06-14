'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface SiteSettingsContextType {
  showAnimations: boolean
  toggleAnimations: () => void
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined)

export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [showAnimations, setShowAnimations] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('siteSettings')
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings)
        if (typeof parsedSettings.showAnimations === 'boolean') {
          setShowAnimations(parsedSettings.showAnimations)
        }
      }
    } catch (error) {
      console.error('Failed to load site settings from localStorage', error)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('siteSettings', JSON.stringify({ showAnimations }))
    } catch (error) {
      console.error('Failed to save site settings to localStorage', error)
    }
  }, [showAnimations])

  const toggleAnimations = () => {
    setShowAnimations((prev) => !prev)
  }

  return (
    <SiteSettingsContext.Provider value={{ showAnimations, toggleAnimations }}>
      {children}
    </SiteSettingsContext.Provider>
  )
}

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext)
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
  }
  return context
}
