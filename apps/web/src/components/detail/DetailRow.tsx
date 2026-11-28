import { DetailLabel } from '#/components/detail/DetailLabel'
import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

export const detailIdClass = 'block min-w-0 truncate font-mono text-[11px] font-medium leading-none text-fg [[data-detail-panel]_&]:min-w-[36ch]'

export const detailCopySlotClass = 'hidden w-3 shrink-0 [[data-detail-panel]_&]:block'

export function DetailCountReserve() {
    return <span class='hidden w-7 shrink-0 [[data-detail-panel]_&]:block' />
}

type DetailRowProps = {
    children: JSX.Element
    label: string
    fit?: boolean
    classes?: {
        root?: string
        label?: string
    }
}

/* 詳細面板的標籤列：固定 74px 的標籤欄，右邊自己撐 */
export function DetailRow(props: DetailRowProps) {
    return (
        <div class={mergeClasses('grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3', props.fit && '[[data-detail-panel]_&]:grid-cols-[74px_max-content]', props.classes?.root)}>
            <DetailLabel class={props.classes?.label}>{props.label}</DetailLabel>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
