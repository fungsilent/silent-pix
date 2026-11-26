import { createContextProvider } from '@solid-primitives/context'
import { batch, onCleanup } from 'solid-js'

import { createStore } from '#/lib/store'
import MetadataWorker from '#/pages/metadata/metadata.worker?worker'

import type { MetadataTab } from '#/pages/metadata/components/MetadataResultPane'
import type { ImageMetadata, MetadataOutcome } from '#/pages/metadata/metadata.parse'

export type MetadataError = Extract<MetadataOutcome, { status: 'error' }>['code'] | 'TIMEOUT' | 'WORKER_FAILED' | 'TOO_MANY_FILES'

type MetadataSessionState = {
    file: File | undefined
    result: ImageMetadata | undefined
    loading: boolean
    error: MetadataError | undefined
    /* 讀檔失敗時 file 已清掉，另外留檔名給錯誤標題 */
    failedName: string | undefined
    previewUrl: string | undefined
    previewSize: { width: number, height: number } | undefined
    previewFailed: boolean
    activeTab: MetadataTab
    useImageAsReference: boolean
}

const workerTimeoutMs = 5000

function createMetadataSession() {
    const store = createStore<MetadataSessionState, {
        setTab: (tab: MetadataTab) => void
        setUseImageAsReference: (checked: boolean) => void
    }>({
        file: undefined,
        result: undefined,
        loading: false,
        error: undefined,
        failedName: undefined,
        previewUrl: undefined,
        previewSize: undefined,
        previewFailed: false,
        activeTab: 'generation',
        useImageAsReference: false,
    }, ({ set }) => ({
        setTab: tab => set('activeTab', tab),
        setUseImageAsReference: checked => set('useImageAsReference', checked),
    }))

    let worker: Worker | undefined
    let timeout: number | undefined

    const stopWorker = () => {
        worker?.terminate()
        worker = undefined
        window.clearTimeout(timeout)
        timeout = undefined
    }

    const releasePreview = () => {
        const url = store.state.previewUrl
        if (url) URL.revokeObjectURL(url)
        store.set({ previewUrl: undefined, previewSize: undefined })
    }

    /* 回到開啟畫面；分頁與勾選是使用者的選擇，不重設 */
    const clear = () => {
        stopWorker()
        releasePreview()
        store.set({ file: undefined, result: undefined, loading: false, error: undefined, previewFailed: false })
    }

    const fail = (code: MetadataError) => {
        const name = store.state.file?.name
        batch(() => {
            clear()
            store.set({ error: code, failedName: name })
        })
    }

    /* 預覽與尺寸一起準備：尺寸供參考圖使用，不依賴預覽元件是否顯示 */
    const preparePreview = (file: File, mime: ImageMetadata['mime']) => {
        let url: string
        try {
            url = URL.createObjectURL(new Blob([file], { type: mime }))
        }
        catch {
            store.set('previewFailed', true)
            return
        }

        store.set('previewUrl', url)
        const probe = new Image()
        probe.addEventListener('load', () => {
            if (store.state.previewUrl === url) store.set('previewSize', { width: probe.naturalWidth, height: probe.naturalHeight })
        })
        probe.addEventListener('error', () => {
            if (store.state.previewUrl !== url) return
            releasePreview()
            store.set('previewFailed', true)
        })
        probe.src = url
    }

    const open = (file: File) => {
        batch(() => {
            clear()
            store.set({ file, loading: true })
        })

        try {
            const activeWorker = new MetadataWorker()
            worker = activeWorker
            const failActive = (code: MetadataError) => {
                if (worker === activeWorker) fail(code)
            }
            activeWorker.onmessage = (event: MessageEvent<MetadataOutcome>) => {
                if (worker !== activeWorker) return
                if (event.data.status === 'error') {
                    fail(event.data.code)
                    return
                }

                const { result } = event.data
                stopWorker()
                batch(() => {
                    store.set({ loading: false, result })
                    preparePreview(file, result.mime)
                })
            }
            activeWorker.onerror = () => failActive('WORKER_FAILED')
            activeWorker.onmessageerror = () => failActive('WORKER_FAILED')
            timeout = window.setTimeout(() => failActive('TIMEOUT'), workerTimeoutMs)
            activeWorker.postMessage(file)
        }
        catch {
            fail('WORKER_FAILED')
        }
    }

    /* 一次只讀一個檔案：已開檔時保留目前結果並回報 'too-many'（由頁面提示），開啟畫面則顯示錯誤 */
    const openFiles = (files: ArrayLike<File>): 'too-many' | undefined => {
        if (files.length === 0) return
        if (files.length > 1) {
            if (store.state.file) return 'too-many'
            fail('TOO_MANY_FILES')
            return
        }
        open(files[0]!)
    }

    onCleanup(() => {
        stopWorker()
        releasePreview()
    })

    return {
        ...store,
        openFiles,
        clear,
    }
}

// MARK: Metadata session access
const [MetadataSessionProvider, readMetadataSession] = createContextProvider(createMetadataSession)
export { MetadataSessionProvider }

export function useMetadataSession() {
    const session = readMetadataSession()
    if (!session) throw new Error('useMetadataSession must be used within MetadataSessionProvider')

    return session
}
