import { storageKeys, writeStorage } from '#/lib/storage'
import { createStore } from '#/lib/store'

export type Theme = 'dark' | 'light'

const themeFromDocument = (): Theme => document.documentElement.dataset.theme === 'light'
    ? 'light'
    : 'dark'

export const themeStore = createStore({ theme: themeFromDocument() }, store => ({
    setTheme: (theme: Theme) => {
        store.set('theme', theme)
        document.documentElement.dataset.theme = theme
        writeStorage(storageKeys.app.theme, theme)
    },
}))
