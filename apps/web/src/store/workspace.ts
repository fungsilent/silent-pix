import { createStore } from '#/lib/store'

export type ViewerImage = {
    url: string
    width: number
    height: number
}

export type CompareEntry = ViewerImage & {
    imageId: string
    originLabel: string | null
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
        const existingIds = new Set(store.state.compare.map(entry => entry.imageId))
        const additions = entries.filter(entry => !existingIds.has(entry.imageId))

        if (additions.length === 0) {
            return
        }

        store.set('compare', current => [...current, ...additions])

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', additions[0]?.imageId ?? null)
        }
    },

    selectCompare(imageId: string) {
        if (store.state.compare.some(entry => entry.imageId === imageId && !entry.hidden)) {
            store.set('selectedCompareImageId', imageId)
        }
    },

    removeCompare(imageId: string) {
        const current = store.state.compare
        const removedIndex = current.findIndex(entry => entry.imageId === imageId)
        if (removedIndex < 0) {
            return
        }

        const selectedId = store.state.selectedCompareImageId
        const next = current.filter(entry => entry.imageId !== imageId)
        store.set('compare', next)

        if (selectedId !== imageId) {
            return
        }

        const visible = next.filter(entry => !entry.hidden)
        const oldVisible = current.filter(entry => !entry.hidden)
        const visibleIndex = oldVisible.findIndex(entry => entry.imageId === imageId)
        const replacement = visible[visibleIndex] ?? visible[visibleIndex - 1]
        store.set('selectedCompareImageId', replacement?.imageId ?? null)
    },

    toggleCompareHidden(imageId: string) {
        const current = store.state.compare
        const entry = current.find(item => item.imageId === imageId)
        if (!entry) {
            return
        }

        if (!entry.hidden) {
            const visible = current.filter(item => !item.hidden)
            const visibleIndex = visible.findIndex(item => item.imageId === imageId)
            const remaining = visible.filter(item => item.imageId !== imageId)
            const replacement = remaining[visibleIndex] ?? remaining[visibleIndex - 1]

            store.set('compare', current.map(item => item.imageId === imageId
                ? { ...item, hidden: true }
                : item))

            if (store.state.selectedCompareImageId === imageId) {
                store.set('selectedCompareImageId', replacement?.imageId ?? null)
            }
            return
        }

        store.set('compare', current.map(item => item.imageId === imageId
            ? { ...item, hidden: false }
            : item))

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', imageId)
        }
    },

    showAllCompare() {
        store.set('compare', current => current.map(entry => ({ ...entry, hidden: false })))

        if (!store.state.selectedCompareImageId) {
            store.set('selectedCompareImageId', store.state.compare[0]?.imageId ?? null)
        }
    },

    clearCompare() {
        store.set('compare', [])
        store.set('selectedCompareImageId', null)
    },

    visibleCompare() {
        return store.state.compare.filter(entry => !entry.hidden)
    },

    openModal() {
        store.set('modalDepth', depth => depth + 1)
    },

    closeModal() {
        store.set('modalDepth', depth => Math.max(0, depth - 1))
    },
}))
