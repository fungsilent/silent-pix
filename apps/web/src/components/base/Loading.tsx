import { Show } from 'solid-js'

import { cn } from '#/lib/cn'
import { isColdLoading } from '#/store/loading'

import type { Accessor, JSX } from 'solid-js'

type SwapProps = {
    children: JSX.Element
    /* cold 時整棵換掉的假 row／cell——清單、格狀這種沒有真實內容可以疊的場合 */
    fallback: JSX.Element
    loading: Accessor<boolean>
}

type WrapProps = {
    children: JSX.Element
    class?: string
    loading: Accessor<boolean>
}

type SkeletonProps = {
    class?: string
}

/*
 * 取代式。只是 <Show> 的包裝，不產生 DOM，所以能直接包住 direct flex/grid item
 * 而不影響 grow/shrink 與 grid placement。
 */
function Swap(props: SwapProps) {
    const loading = isColdLoading(() => props.loading())

    return (
        <Show
            when={!loading()}
            fallback={props.fallback}
        >
            {props.children}
        </Show>
    )
}

/*
 * 整塊遮。value cell、卡片、圖片區這種沒有 label／control 之分的內容。
 * 會多包一層 relative 當 absolute mask 的 containing block——被包的元素
 * 若本身是 direct flex/grid item，改用 Loading.Skeleton 掛在既有 anchor 上。
 */
function Mask(props: WrapProps) {
    const loading = isColdLoading(() => props.loading())

    return (
        <div class={cn('relative min-w-0', props.class)}>
            {props.children}
            <Show when={loading()}>
                <Skeleton class='absolute inset-0' />
            </Show>
        </div>
    )
}

/*
 * 欄位式。只遮 field 底部的 control，上方 label 留著。
 * Text／Number／Select／Editable 的 control 都是 h-8 且對齊 root 底部——
 * 這個 h-8 跟著 components/field 走，primitive 改高度這裡要同步。
 */
function Control(props: WrapProps) {
    const loading = isColdLoading(() => props.loading())

    return (
        <div class={cn('relative min-w-0', props.class)}>
            {props.children}
            <Show when={loading()}>
                <Skeleton class='absolute inset-x-0 bottom-0 h-8' />
            </Show>
        </div>
    )
}

/*
 * 隱藏式。所在區塊刻意不鋪灰罩（例如 ImageStage 要維持全黑），浮在上面的
 * 控制項沒有東西可以遮，只能自己隱形。用 visibility 而不是 <Show>：留在
 * DOM 版面才不會跳，而且 visibility: hidden 同時擋掉 focus。
 */
function Hide(props: WrapProps) {
    const loading = isColdLoading(() => props.loading())

    return (
        <div
            class={props.class}
            classList={{ invisible: loading() }}
        >
            {props.children}
        </div>
    )
}

/* 灰格本體。顏色與動畫在 styles.css 的 .skeleton，這裡只決定尺寸與位置。 */
function Skeleton(props: SkeletonProps) {
    return (
        <span
            aria-hidden='true'
            class={cn('skeleton pointer-events-none block rounded-md', props.class)}
        />
    )
}

/*
 * 所有 loading 呈現都掛在這個 namespace 下，讀 code 時一眼可辨。
 * 粒度以 field 為單位：能只遮 control 就不要整塊遮，能保留 label 就保留。
 *
 * inert 不在這裡——它是屬性，必須掛在既有節點上，包一層 wrapper 反而
 * 破壞版面。互動阻斷仍由各 page 自己在既有 root 加 inert。
 *
 * 掛 inert 時避開捲動容器本身：inert 的子樹退出 hit-testing，滾輪會找不到
 * 捲動目標。要遮整個捲動區就在裡面加一層 display: contents 的載體。
 */
export const Loading = {
    Control,
    Hide,
    Mask,
    Skeleton,
    Swap,
}
