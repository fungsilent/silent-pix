import { createContextProvider } from '@solid-primitives/context'
import { createEffect, createSignal, on } from 'solid-js'

import { isPreviewing } from '#/store/dev'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

/* 提供選取 Task 的查詢衍生值，讓 Generate 各區共用同一次查詢。 */
export type GenerateDetail = {
    draft: Accessor<boolean>
    error: Accessor<boolean>
    loading: Accessor<boolean>
    task: Accessor<TaskApi.GetTaskResponse | undefined>
    sourceTask: Accessor<TaskApi.GetTaskResponse | undefined>
    editable: Accessor<boolean>
    imageIndex: Accessor<number>
    selectImage: (index: number) => void
    retry: () => void
}

/* 尚未套用預覽規則的原始 query 狀態 */
export type GenerateDetailSource = Omit<GenerateDetail, 'editable' | 'imageIndex' | 'selectImage'> & {
    selectionLoaded: Accessor<boolean>
}

/*
 * 唯一套用 Dev Settings 預覽規則的地方。三條規則必須放在一起，preview 畫面才會
 * 跟真實 cold load 逐格相同——少了 task 那條，遮罩底下就會留著真實資料，
 * 而 ImageStage 這種不鋪灰罩的區塊會直接露出圖片與縮圖列。
 *
 * 消費端拿到的 loading 已經是最終值，不需要再過一次 isColdLoading。
 */
export function createGenerateDetail(source: GenerateDetailSource): GenerateDetail {
    const error = () => !isPreviewing() && source.error()
    const loading = () => isPreviewing() || source.loading()
    const task = () => isPreviewing() ? undefined : source.task()
    const sourceTask = () => isPreviewing() ? undefined : source.sourceTask()
    const [imageIndex, setImageIndex] = createSignal(0)
    createEffect(on(() => (task() ?? sourceTask())?.id, () => setImageIndex(0)))

    return {
        draft: () => !isPreviewing() && source.draft(),
        error,
        loading,
        task,
        sourceTask,
        editable: () => source.selectionLoaded() && !loading() && !error(),
        imageIndex,
        selectImage: setImageIndex,
        retry: source.retry,
    }
}

const [GenerateDetailProvider, readGenerateDetail] = createContextProvider((props: { value: GenerateDetail }) => props.value)
export { GenerateDetailProvider }

export function useGenerateDetail(): GenerateDetail {
    const detail = readGenerateDetail()
    if (!detail) throw new Error('useGenerateDetail must be used within GenerateDetailProvider')

    return detail
}
