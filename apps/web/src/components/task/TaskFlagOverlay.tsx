import { Show } from 'solid-js'

import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'

/* MARK: TaskFlagOverlay */

type TaskFlagOverlayProps = {
    pin: boolean
    discard: boolean
    /* 沒有縮圖或載體已有遮罩時不壓暗 */
    dim: boolean
    /* 角摺的邊長跟著縮圖走：列表是固定 72px 的小圖，卡片的圖大得多 */
    carrier: 'card' | 'item'
}

const foldSizeClasses = {
    card: 'border-r-[26px] border-t-[26px]',
    item: 'border-r-[22px] border-t-[22px]',
} as const

/*
 * 縮圖上的狀態層，常駐、不可點，未標記時完全不存在。
 * discard 先壓一層黑幕再畫角摺：亮照片會把霧藍角摺吃掉，壓暗同時解決辨識與語意。
 * 壓的只有照片；沒有縮圖時不壓暗狀態圖示。
 * 收合成只剩縮圖時角摺自動成為唯一訊號，所以不另做疊在圖上的 badge。
 */
export function TaskFlagOverlay(props: TaskFlagOverlayProps) {
    return (
        <>
            <Show when={props.discard && props.dim}>
                <span class='pointer-events-none absolute inset-0 bg-discard-dim' />
            </Show>
            <Show when={props.pin || props.discard}>
                <span
                    class={cn(
                        'pointer-events-none absolute left-0 top-0 border-r-transparent',
                        foldSizeClasses[props.carrier],
                        props.pin ? theme.taskFlag.pin.fold : theme.taskFlag.discard.fold,
                    )}
                />
            </Show>
        </>
    )
}
