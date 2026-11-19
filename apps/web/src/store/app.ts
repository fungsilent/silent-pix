import { createStore } from '#/lib/store'

import type { EventConnectionStatus } from '@silent-pix/event/client'
import type { Event } from '@silent-pix/shared'

type AppState = {
    connection: EventConnectionStatus
    snapshot: Event.Health.Snapshot | undefined
    hasConnected: boolean
}

const initialState: AppState = {
    connection: 'disconnected',
    snapshot: undefined,
    hasConnected: false,
}

export const appStore = createStore(initialState, store => ({
    setConnection(connection: EventConnectionStatus) {
        store.set('connection', connection)

        if (connection === 'connected') {
            store.set('hasConnected', true)
        }
    },

    setSnapshot(snapshot: Event.Health.Snapshot) {
        store.set('snapshot', snapshot)
    },
}))

/*
 * WS 一斷就視為未知，不得沿用最後一份快照——
 * 否則斷線之後指示燈會繼續顯示綠色，而那是任何一次斷線後的預設行為。
 */
export function serviceHealth(): Event.Health.Snapshot | undefined {
    return appStore.state.connection === 'connected'
        ? appStore.state.snapshot
        : undefined
}

/* 連上過又掉了才算失聯；還沒連上過只是開機中 */
export function hasLostConnection(): boolean {
    return appStore.state.hasConnected && appStore.state.connection !== 'connected'
}
