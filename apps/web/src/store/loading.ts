import { createStore } from '#/lib/store'

import type { Accessor } from 'solid-js'

type LoadingState = {
    /* Header 的 dev-only 預覽開關 */
    preview: boolean
}

const initialState: LoadingState = {
    preview: false,
}

export const loadingStore = createStore(initialState, store => ({
    togglePreview() {
        store.set('preview', value => !value)
    },
}))

/* import.meta.env.DEV 是常數，production build 會整段被搖掉 */
export function isPreviewing(): boolean {
    return import.meta.env.DEV && loadingStore.state.preview
}

/*
 * 全站唯一的 cold-loading 判定。預覽開關只在這裡與 <Loading> 接上，
 * boundary 不必各自 OR 一次——這是「任何真實 loading 都要能被 Header
 * 的按鈕重現」的唯一接點。
 *
 * 用 query hook 的 isLoading 而不是 isFetching && !data：TanStack Query v5 的
 * isLoading 是 isPending && isFetching，也就是「沒有 data、沒有 error、正在
 * fetch」，正是 cold loading 的定義；error 之後 status 是 'error'，isPending
 * 已經是 false，所以 retry 不會退回 Skeleton。observer 本來就綁在當前 key 上，
 * exact 匹配是免費的，不需要另外共用 query key。
 */
export function isColdLoading(loading: Accessor<boolean>): Accessor<boolean> {
    return () => isPreviewing() || loading()
}
