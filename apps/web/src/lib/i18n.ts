import { createInstance } from 'i18next'

import en from '#/i18n/en.json'

const i18n = createInstance()

// Bundled resources must be ready for module-level labels before startup runs.
export const i18nReady = i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en'],
    defaultNS: 'translation',
    initAsync: false,
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
})

export const t = i18n.t
