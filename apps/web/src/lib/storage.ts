import type { z } from 'zod'

export const storageKeys = {
    app: {
        theme: 'app.theme',
        locale: 'app.locale',
        imagePickerColumns: 'app.image-picker-columns',
    },
    generate: {
        promptHeight: 'generate.prompt-height',
        promptGutter: 'generate.prompt-gutter',
        promptVisible: 'generate.prompt-visible',
        taskBrowserOpen: 'generate.task-browser-open',
        taskBrowserColumns: 'generate.task-browser-columns',
        taskListCollapsed: 'generate.task-list-collapsed',
        detailCollapsed: 'generate.detail-collapsed',
    },
    compare: {
        detailCollapsed: 'compare.detail-collapsed',
    },
} as const

type Keys = typeof storageKeys
export type StorageKey = { [Page in keyof Keys]: Keys[Page][keyof Keys[Page]] }[keyof Keys]

export function readStorage<T>(key: StorageKey, schema: z.ZodType<T>): T | undefined {
    try {
        const raw = localStorage.getItem(key)
        if (raw === null) return undefined

        const result = schema.safeParse(JSON.parse(raw))
        return result.success ? result.data : undefined
    }
    catch {
        return undefined
    }
}

export function writeStorage(key: StorageKey, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    }
    catch { /* storage 停用時只在這次生效 */ }
}
