import { createStore as createSolidStore } from 'solid-js/store'

import type { SetStoreFunction, Store } from 'solid-js/store'

type CoreStore<TState extends object> = {
    state: Store<TState>
    set: SetStoreFunction<TState>
}

type StoreApi<TState extends object, TActions extends object> = CoreStore<TState> & Omit<TActions, keyof CoreStore<TState>>

type ActionFactory<TState extends object, TActions extends object> = (
    store: CoreStore<TState>,
) => TActions

const reservedStoreKeys = new Set<string>([
    'state',
    'set',
])

const assertActionKeys = (actions: Record<string, unknown>) => {
    Object.keys(actions).forEach(key => {
        if (reservedStoreKeys.has(key)) {
            throw new Error(`Store action cannot overwrite core key: ${key}`)
        }
    })
}

export function createStore<TState extends object, TActions extends object>(
    initialState: TState,
    actions: ActionFactory<TState, TActions>,
): StoreApi<TState, TActions> {
    const [state, set] = createSolidStore(initialState)

    const core: CoreStore<TState> = {
        state,
        set,
    }

    const customActions = actions(core)
    assertActionKeys(customActions as Record<string, unknown>)

    return {
        ...core,
        ...customActions,
    }
}
