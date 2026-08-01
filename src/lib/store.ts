'use client'

import { create } from 'zustand'
import type { SafeUser, PropertyWithRelations } from './constants'

export type View =
  | { name: 'home' }
  | { name: 'listings'; query?: Record<string, string | number | undefined> }
  | { name: 'detail'; propertyId: string }
  | { name: 'post' }
  | { name: 'edit'; propertyId: string }
  | { name: 'chats'; chatId?: string }
  | { name: 'favorites' }
  | { name: 'profile' }
  | { name: 'dashboard' }
  | { name: 'vendor' }
  | { name: 'my-listings' }
  | { name: 'admin' }
  | { name: 'pricing' }
  | { name: 'compare'; ids: string[] }

interface AppState {
  // auth
  user: SafeUser | null
  authLoading: boolean
  csrfToken: string | null
  setUser: (user: SafeUser | null) => void
  setCsrfToken: (token: string | null) => void
  fetchUser: () => Promise<void>

  // navigation
  view: View
  history: View[]
  navigate: (view: View) => void
  goBack: () => void

  // ui
  authModalOpen: boolean
  authModalMode: 'login' | 'signup'
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void

  // pending post-property after auth
  pendingPostProperty: boolean
  setPendingPostProperty: (v: boolean) => void

  // compare tray — list of property IDs the user has queued for comparison
  compareIds: string[]
  toggleCompare: (id: string) => void
  clearCompare: () => void
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  authLoading: true,
  csrfToken: null,
  setUser: user => set({ user }),
  setCsrfToken: csrfToken => set({ csrfToken }),
  fetchUser: async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const csrf = res.headers.get('x-csrf-token')
        set({ user: data.user, csrfToken: csrf, authLoading: false })
        return
      }
    } catch {
      // ignore
    }
    set({ user: null, csrfToken: null, authLoading: false })
  },

  view: { name: 'home' },
  history: [],
  navigate: view => {
    const current = get().view
    set({ view, history: [...get().history, current].slice(-30) })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  },
  goBack: () => {
    const history = get().history
    if (history.length === 0) {
      set({ view: { name: 'home' } })
      return
    }
    const prev = history[history.length - 1]!
    set({ view: prev, history: history.slice(0, -1) })
  },

  authModalOpen: false,
  authModalMode: 'login',
  openAuthModal: (mode = 'login') => set({ authModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ authModalOpen: false }),

  pendingPostProperty: false,
  setPendingPostProperty: v => set({ pendingPostProperty: v }),

  compareIds: [],
  toggleCompare: id => set(state => {
    const exists = state.compareIds.includes(id)
    if (exists) {
      return { compareIds: state.compareIds.filter(x => x !== id) }
    }
    // Max 4 properties for comparison
    if (state.compareIds.length >= 4) {
      return state
    }
    return { compareIds: [...state.compareIds, id] }
  }),
  clearCompare: () => set({ compareIds: [] }),
}))

// Helper hook: require auth, otherwise open modal
export function useRequireAuth() {
  const { user, openAuthModal } = useApp()
  return (next?: () => void) => {
    if (!user) {
      openAuthModal('login')
      return false
    }
    next?.()
    return true
  }
}
