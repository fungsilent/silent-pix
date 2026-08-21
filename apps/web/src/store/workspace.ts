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
