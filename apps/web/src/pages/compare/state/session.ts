import { createContextProvider } from '@solid-primitives/context'

import { createStore } from '#/lib/store'

import type { ImageApi } from '@silent-pix/shared'

/* 只存 Compare 讀的欄位；task 名稱等由 task detail query 提供 */
export type CompareUsage = Pick<ImageApi.ImageUsage, 'type' | 'taskId'>

export type CompareEntry = {
    image: ImageApi.ImageResource
    usage: CompareUsage | null
    hidden: boolean
}

// MARK: State
type CompareState = {
    compare: CompareEntry[]
    selectedCompareImageId: string | null
}

const initialState = (): CompareState => ({
    compare: [],
    selectedCompareImageId: null,
})

const createCompareSession = () => createStore(initialState(), store => ({
    // MARK: Add and select
    addCompare(entries: CompareEntry[]) {
        const existingIds = new Set(store.state.compare.map(entry => entry.image.id))
        /* 呼叫者可能傳入較寬的 usage（例如 picker 的 matchedUsage），只投影出要存的欄位 */
        const additions = entries
            .filter(entry => !existingIds.has(entry.image.id))
            .map(entry => ({
                image: entry.image,
                usage: entry.usage && { type: entry.usage.type, taskId: entry.usage.taskId },
                hidden: entry.hidden,
            }))

        if (additions.length === 0) {
            return
        }

        store.set('compare', current => [...current, ...additions])
    },

    selectCompare(imageId: string) {
        if (store.state.compare.some(entry => entry.image.id === imageId && !entry.hidden)) {
            store.set('selectedCompareImageId', imageId)
        }
    },

    // MARK: Remove and hide
    removeCompare(imageId: string) {
        const current = store.state.compare
        const removedIndex = current.findIndex(entry => entry.image.id === imageId)

        if (removedIndex < 0) {
            return
        }

        const selectedId = store.state.selectedCompareImageId
        const next = current.filter(entry => entry.image.id !== imageId)
        store.set('compare', next)

        if (selectedId !== imageId) {
            return
        }

        const visible = next.filter(entry => !entry.hidden)
        const oldVisible = current.filter(entry => !entry.hidden)
        const visibleIndex = oldVisible.findIndex(entry => entry.image.id === imageId)
        const replacement = visible[visibleIndex] ?? visible[visibleIndex - 1]
        store.set('selectedCompareImageId', replacement?.image.id ?? null)
    },

    toggleCompareHidden(imageId: string) {
        const current = store.state.compare
        const entry = current.find(item => item.image.id === imageId)

        if (!entry) {
            return
        }

        if (!entry.hidden) {
            const visible = current.filter(item => !item.hidden)
            const visibleIndex = visible.findIndex(item => item.image.id === imageId)
            const remaining = visible.filter(item => item.image.id !== imageId)
            const replacement = remaining[visibleIndex] ?? remaining[visibleIndex - 1]
            const wasSelected = store.state.selectedCompareImageId === imageId

            store.set('compare', current.map(item => item.image.id === imageId
                ? { ...item, hidden: true }
                : item))

            if (wasSelected) {
                store.set('selectedCompareImageId', replacement?.image.id ?? null)
            }
            return
        }

        store.set('compare', current.map(item => item.image.id === imageId
            ? { ...item, hidden: false }
            : item))

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', imageId)
        }
    },

    showAllCompare() {
        store.set('compare', current => current.map(entry => ({ ...entry, hidden: false })))

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', store.state.compare[0]?.image.id ?? null)
        }
    },

    clearCompare() {
        store.set('compare', [])
        store.set('selectedCompareImageId', null)
    },

    // MARK: Visible entries
    visibleCompare() {
        return store.state.compare.filter(entry => !entry.hidden)
    },
    selectedCompare() {
        return store.state.compare.find(entry => entry.image.id === store.state.selectedCompareImageId)
    },
}))

// MARK: Compare session access
const [CompareSessionProvider, readCompareSession] = createContextProvider(createCompareSession)
export { CompareSessionProvider }

export function useCompareSession() {
    const session = readCompareSession()
    if (!session) throw new Error('useCompareSession must be used within CompareSessionProvider')

    return session
}
