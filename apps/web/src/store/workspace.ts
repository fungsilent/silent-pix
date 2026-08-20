import { createStore } from '#/lib/store'

type WorkspaceState = {
    mode: 'generate' | 'compare'
    modalDepth: number
}

const initialState: WorkspaceState = {
    mode: 'generate',
    modalDepth: 0,
}

export const workspaceStore = createStore(initialState, store => ({
    setMode(mode: WorkspaceState['mode']) {
        store.set('mode', mode)
    },

    openModal() {
        store.set('modalDepth', depth => depth + 1)
    },

    closeModal() {
        store.set('modalDepth', depth => Math.max(0, depth - 1))
    },
}))
