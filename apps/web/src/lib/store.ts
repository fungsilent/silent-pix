import { createStore as createSolidStore, produce as solidProduce, reconcile as solidReconcile } from 'solid-js/store'

import type { SetStoreFunction, Store } from 'solid-js/store'

type StoreKey<TState> = Extract<keyof TState, string>

type CoreStore<TState extends object> = {
    state: Store<TState>
    set: SetStoreFunction<TState>
    reconcile: <TKey extends StoreKey<TState>>(key: TKey, value: TState[TKey]) => void
    produce: <TKey extends StoreKey<TState>>(key: TKey, producer: (value: TState[TKey]) => void) => void
}

type StoreApi<TState extends object, TActions extends object> = CoreStore<TState> & Omit<TActions, keyof CoreStore<TState>>

type ActionFactory<TState extends object, TActions extends object> = (
    store: CoreStore<TState>,
) => TActions

type TopLevelSetter<TState extends object> = <TKey extends StoreKey<TState>>(
    key: TKey,
    value: unknown,
) => void

const reservedStoreKeys = new Set<string>([
    'state',
    'set',
    'reconcile',
    'produce',
])

const assertActionKeys = (actions: Record<string, unknown>) => {
    Object.keys(actions).forEach(key => {
        if (reservedStoreKeys.has(key)) {
            throw new Error(`Store action cannot overwrite core key: ${key}`)
        }
    })
}

export function createStore<TState extends object>(initialState: TState): StoreApi<TState, Record<string, never>>
export function createStore<TState extends object, TActions extends object>(
    initialState: TState,
    actions: ActionFactory<TState, TActions>,
): StoreApi<TState, TActions>
export function createStore<TState extends object, TActions extends object>(
    initialState: TState,
    actions?: ActionFactory<TState, TActions>,
) {
    const [state, set] = createSolidStore(initialState)
    const setTopLevel = set as TopLevelSetter<TState>

    const core: CoreStore<TState> = {
        state,
        set,
        reconcile: (key, value) => {
            setTopLevel(key, solidReconcile(value))
        },
        produce: (key, producer) => {
            setTopLevel(key, solidProduce(producer))
        },
    }

    if (!actions) {
        return core
    }

    const customActions = actions(core)
    assertActionKeys(customActions as Record<string, unknown>)

    return {
        ...core,
        ...customActions,
    }
}