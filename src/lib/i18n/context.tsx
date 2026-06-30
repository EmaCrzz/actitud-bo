'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { TranslationKey, TranslationParams } from './types'
import { createTranslator } from './api'

interface i18nClientContextType {
  t: (key: TranslationKey, params?: TranslationParams) => string
}

const i18nClientContext = createContext<i18nClientContextType | null>(null)

interface TranslationProviderProps {
  children: ReactNode
  dictionary: Record<string, string>
}

export function I18nClientProvider({ children, dictionary }: TranslationProviderProps) {
  return (
    <i18nClientContext.Provider value={{ t: createTranslator(dictionary) }}>
      {children}
    </i18nClientContext.Provider>
  )
}

export function useTranslations(): i18nClientContextType {
  const context = useContext(i18nClientContext)

  if (!context) {
    throw new Error('usei18nClientContext must be used within a TranslationProvider')
  }

  return context
}
