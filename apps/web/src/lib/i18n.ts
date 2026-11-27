import { createInstance } from 'i18next'
import { z } from 'zod'

import en from '#/i18n/en.json'
import zhTW from '#/i18n/zh-tw.json'
import { readStorage, storageKeys, writeStorage } from '#/lib/storage'
import { createStore } from '#/lib/store'

const resources = { en: { translation: en }, 'zh-TW': { translation: zhTW } }
type Locale = keyof typeof resources

const initialLocale: Locale = readStorage(storageKeys.app.locale, z.enum(['en', 'zh-TW'])) ?? 'en'

const i18n = createInstance()

export const i18nReady = i18n.init({
    lng: initialLocale,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources),
    defaultNS: 'translation',
    initAsync: false,
    resources,
    interpolation: { escapeValue: false },
})
document.documentElement.lang = initialLocale

export const localeStore = createStore({ locale: initialLocale }, ({ set }) => ({
    setLocale(value: string) {
        if (value !== 'en' && value !== 'zh-TW') return

        void i18n.changeLanguage(value)
        set('locale', value)
        document.documentElement.lang = value
        writeStorage(storageKeys.app.locale, value)
    },
}))

// Track language reads in Solid while preserving i18next's typed call signatures.
export const t = new Proxy(i18n.t, {
    apply(target, receiver, args: Parameters<typeof i18n.t>) {
        void localeStore.state.locale
        return Reflect.apply(target, receiver, args)
    },
})
