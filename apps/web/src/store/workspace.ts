import { createStore } from '#/lib/store'

import type { ImageApi } from '@silent-pix/shared'

export type ViewerImage = {
    url: string
    width: number
    height: number
}

export type CompareEntry = {
    image: ImageApi.ImageResource
    origin: ImageApi.ImageUsage | null
    hidden: boolean
}

type WorkspaceState = {
    mode: 'generate' | 'compare'
    compare: CompareEntry[]
    selectedCompareImageId: string | null
    modalDepth: number
}

const initialState: WorkspaceState = {
    mode: 'generate',
    compare: [],
    selectedCompareImageId: null,
    modalDepth: 0,
}

export const workspaceStore = createStore(initialState, store => ({
    setMode(mode: WorkspaceState['mode']) {
        store.set('mode', mode)
    },

    addCompare(entries: CompareEntry[]) {
        const existingIds = new Set(store.state.compare.map(entry => entry.image.id))
        const additions = entries.filter(entry => !existingIds.has(entry.image.id))

        if (additions.length === 0) {
            return
        }

        store.set('compare', current => [...current, ...additions])

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', additions[0]?.image.id ?? null)
        }
    },

    selectCompare(imageId: string) {
        if (store.state.compare.some(entry => entry.image.id === imageId && !entry.hidden)) {
            store.set('selectedCompareImageId', imageId)
        }
    },

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

            store.set('compare', current.map(item => item.image.id === imageId
                ? { ...item, hidden: true }
                : item))

            if (store.state.selectedCompareImageId === imageId) {
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

    visibleCompare() {
        return store.state.compare.filter(entry => !entry.hidden)
    },

    selectedCompare() {
        return store.state.compare.find(entry => entry.image.id === store.state.selectedCompareImageId)
    },

    openModal() {
        store.set('modalDepth', depth => depth + 1)
    },

    closeModal() {
        store.set('modalDepth', depth => Math.max(0, depth - 1))
    },
}))
