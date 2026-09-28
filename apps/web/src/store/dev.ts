import { createStore } from '#/lib/store'

import type { Accessor } from 'solid-js'

export type DevMode = 'normal' | 'dev'

type DevState = {
    mode: DevMode
    loadingPreview: boolean
}

const initialState: DevState = {
    mode: 'normal',
    loadingPreview: false,
}

export const devStore = createStore(initialState, store => ({
    setMode(mode: DevMode) {
        store.set({
            mode,
            loadingPreview: mode === 'normal'
                ? false
                : store.state.loadingPreview,
        })
    },

    setLoadingPreview(loadingPreview: boolean) {
        store.set('loadingPreview', store.state.mode === 'dev' && loadingPreview)
    },
}))

export function isPreviewing(): boolean {
    return devStore.state.mode === 'dev' && devStore.state.loadingPreview
}

export function isColdLoading(loading: Accessor<boolean>): Accessor<boolean> {
    return () => isPreviewing() || loading()
}
