'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Lang, translate } from './i18n-dictionary'

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'estatebazaar-lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  // Load saved language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
      if (saved && ['en', 'hi', 'ta', 'te'].includes(saved)) {
        // Defer to avoid synchronous setState in effect
        const t = setTimeout(() => setLangState(saved), 0)
        return () => clearTimeout(t)
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    // Update <html lang="..."> for accessibility
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
  }

  const t = (key: string) => translate(lang, key)

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback if used outside provider (shouldn't happen but safe)
    return {
      lang: 'en',
      setLang: () => {},
      t: (key: string) => translate('en', key),
    }
  }
  return ctx
}
