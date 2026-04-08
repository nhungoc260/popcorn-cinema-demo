import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: 'customer' | 'staff' | 'admin'
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  refresh: string | null
  setAuth: (user: User, token: string, refresh: string) => void
  updateUser: (user: Partial<User>) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refresh: null,
      setAuth: (user, token, refresh) => set({ user, token, refresh }),
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
      logout: () => set({ user: null, token: null, refresh: null }),
    }),
    { name: 'popcorn-auth' }
  )
)
