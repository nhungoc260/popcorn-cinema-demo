import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  mode: 'dark' | 'light'
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      toggleMode: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark'
        set({ mode: next })
        // Apply to :root
        document.documentElement.setAttribute('data-theme', next)
      },
    }),
    {
      name: 'popcorn-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.mode)
        }
      },
    }
  )
)
