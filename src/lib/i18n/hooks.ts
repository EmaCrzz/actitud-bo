'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTranslations, getLanguage, setLanguage, type Language, LANGUAGES } from './index'
import type { TranslationKey, TranslationParams } from './types'

// Hook for client-side translations
export function useTranslation() {
  const [t, setT] = useState<((key: TranslationKey, params?: TranslationParams) => string) | null>(null)
  const [language, setCurrentLanguage] = useState<Language>(LANGUAGES.ES)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTranslations = useCallback(async (lang: Language) => {
    try {
      setIsLoading(true)
      setError(null)
      const { t: translator } = await getTranslations(lang)
      setT(() => translator)
      setCurrentLanguage(lang)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load translations')
      console.error('Error loading translations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const changeLanguage = useCallback(async (newLang: Language) => {
    setLanguage(newLang)
    await loadTranslations(newLang)
  }, [loadTranslations])

  useEffect(() => {
    const currentLang = getLanguage()
    loadTranslations(currentLang)
  }, [loadTranslations])

  return {
    t: t || ((key: TranslationKey) => key), // Fallback function that returns the key
    language,
    changeLanguage,
    isLoading,
    error,
    availableLanguages: LANGUAGES
  }
}

// Simple hook for when you only need the t function
export function useT() {
  const { t } = useTranslation()
  return t
}