import { createStore } from '#/lib/store'

export type OverlayId = string

type OverlayState = {
    stack: OverlayId[]
}

const initialState: OverlayState = {
    stack: [],
}

export const overlayStore = createStore(initialState, store => ({
    open(): OverlayId {
        const id = crypto.randomUUID()
        store.set('stack', stack => [...stack, id])
        return id
    },

    close(id: OverlayId) {
        store.set('stack', stack => stack.filter(item => item !== id))
    },

    isActive() {
        return store.state.stack.length > 0
    },

    isTop(id: OverlayId) {
        return store.state.stack.at(-1) === id
    },
}))
