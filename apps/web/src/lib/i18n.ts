import { createInstance } from 'i18next'

import en from '#/i18n/en.json'
import zhTW from '#/i18n/zh-TW.json'
import { createStore } from '#/lib/store'

const resources = { en: { translation: en }, 'zh-TW': { translation: zhTW } }
type Locale = keyof typeof resources

const storageKey = 'silent-pix.locale'
let initialLocale: Locale = 'en'
try {
    if (localStorage.getItem(storageKey) === 'zh-TW') initialLocale = 'zh-TW'
}
catch {
    // Browser storage may be disabled; language still works for this session.
}

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
        try {
            localStorage.setItem(storageKey, value)
        }
        catch {
            // Keep the selected language even when storage is unavailable.
        }
    },
}))

// Track language reads in Solid while preserving i18next's typed call signatures.
export const t = new Proxy(i18n.t, {
    apply(target, receiver, args: Parameters<typeof i18n.t>) {
        void localeStore.state.locale
        return Reflect.apply(target, receiver, args)
    },
})
