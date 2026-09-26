import { FlagTriangleRight, HeartX } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

/* MARK: TaskFlagOverlay */

type TaskFlagOverlayProps = {
    pin: boolean
    discard: boolean
    /* 沒有縮圖時底下是 queued／running／failed 的狀態圖示，不能被黑幕蓋掉 */
    hasImage: boolean
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
 * 壓的只有照片——卡片與列的文字、狀態、時間都不動；沒有縮圖時也不壓，
 * 那塊位置放的是 queued／running／failed 的狀態圖示，蓋掉就讀不出任務出了什麼事。
 * 收合成只剩縮圖時角摺自動成為唯一訊號，所以不另做疊在圖上的 badge。
 */
export function TaskFlagOverlay(props: TaskFlagOverlayProps) {
    return (
        <>
            <Show when={props.discard && props.hasImage}>
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

/* MARK: TaskFlagControls */

type TaskFlagControlsProps = {
    pin: boolean
    discard: boolean
    pending: boolean
    onChange: (flag: TaskApi.TaskFlag | null) => void
    /* 定位由載體決定：卡片掛在 ID 行右端，列浮在右上角 */
    class?: string
}

/*
 * 操作：兩顆都要在才切換得了，所以 active 與 inactive 一起顯示。
 * 兩顆都只在 hover／focus 整張卡或整列時浮現，常駐的視覺訊號交給角摺。
 */
export function TaskFlagControls(props: TaskFlagControlsProps) {
    return (
        <div
            class={cn(
                'absolute flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                props.class,
            )}
        >
            <TaskFlagButton
                active={props.pin}
                pending={props.pending}
                activeClass={theme.taskFlag.pin.active}
                onClick={() => props.onChange(props.pin ? null : 'pin')}
            >
                <FlagTriangleRight
                    size={14}
                    strokeWidth={1.8}
                />
            </TaskFlagButton>
            <TaskFlagButton
                active={props.discard}
                pending={props.pending}
                activeClass={theme.taskFlag.discard.active}
                onClick={() => props.onChange(props.discard ? null : 'discard')}
            >
                <HeartX
                    size={14}
                    strokeWidth={1.8}
                />
            </TaskFlagButton>
        </div>
    )
}

type TaskFlagButtonProps = {
    active: boolean
    pending: boolean
    activeClass: string
    onClick: () => void
    children: JSX.Element
}

function TaskFlagButton(props: TaskFlagButtonProps) {
    return (
        <Button
            variant='ghost'
            data-marquee-control='true'
            disabled={props.pending}
            classes={{
                root: cn(
                    'size-7 shrink-0 rounded-md border-0 p-0',
                    props.active ? props.activeClass : theme.taskFlag.inactive,
                ),
            }}
            onClick={props.onClick}
        >
            {props.children}
        </Button>
    )
}
