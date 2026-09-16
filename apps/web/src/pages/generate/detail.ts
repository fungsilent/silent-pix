import { createContext, useContext } from 'solid-js'

import { isPreviewing } from '#/store/loading'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor, JSX } from 'solid-js'

/*
 * 選中 task 的唯讀 detail。只公開衍生後的 accessor，不儲存也不複製任何東西：
 * TanStack Query 仍然是 server data 的唯一擁有者，GenerateStore 仍然只放 form
 * 與 UI state。這一層存在的目的只有一個——消掉 Workspace 與 TaskDetail 那兩段
 * 純轉手的 prop chain。
 *
 * CompareDetail 有自己的 detail query，在它內部再包一層同類 provider 覆蓋。
 */
export type GenerateDetail = {
    draft: Accessor<boolean>
    /* query 失敗且沒有可用 task */
    error: Accessor<boolean>
    loading: Accessor<boolean>
    /* cold loading 或 error 時為 undefined */
    task: Accessor<TaskApi.GetTaskResponse | undefined>
}

/* 尚未套用預覽規則的原始 query 狀態 */
export type GenerateDetailSource = GenerateDetail

/*
 * 唯一套用 Header 預覽規則的地方。三條規則必須放在一起，preview 畫面才會
 * 跟真實 cold load 逐格相同——少了 task 那條，遮罩底下就會留著真實資料，
 * 而 ImageStage 這種不鋪灰罩的區塊會直接露出圖片與縮圖列。
 *
 * 消費端拿到的 loading 已經是最終值，不需要再過一次 isColdLoading。
 */
export function createGenerateDetail(source: GenerateDetailSource): GenerateDetail {
    return {
        draft: () => !isPreviewing() && source.draft(),
        error: () => !isPreviewing() && source.error(),
        loading: () => isPreviewing() || source.loading(),
        task: () => isPreviewing() ? undefined : source.task(),
    }
}

const GenerateDetailContext = createContext<GenerateDetail>()

type GenerateDetailProviderProps = {
    children: JSX.Element
    value: GenerateDetail
}

export function GenerateDetailProvider(props: GenerateDetailProviderProps) {
    return GenerateDetailContext.Provider({
        get children() {
            return props.children
        },
        value: props.value,
    })
}

export function useGenerateDetail(): GenerateDetail {
    const detail = useContext(GenerateDetailContext)

    if (!detail) {
        throw new Error('Generate detail context is missing')
    }

    return detail
}
