import { createStore } from '#/lib/store'

export type Theme = 'dark' | 'light'

const storageKey = 'silent-pix.theme'

const themeFromDocument = (): Theme => document.documentElement.dataset.theme === 'light'
    ? 'light'
    : 'dark'

export const themeStore = createStore({ theme: themeFromDocument() }, store => ({
    setTheme: (theme: Theme) => {
        store.set('theme', theme)
        document.documentElement.dataset.theme = theme

        try {
            localStorage.setItem(storageKey, theme)
        }
        catch {
            /* Session changes still work when persistence is unavailable. */
        }
    },
    toggleTheme: () => {
        const theme: Theme = store.state.theme === 'dark' ? 'light' : 'dark'
        themeStore.setTheme(theme)
    },
}))
