import { DetailLabel } from '#/components/detail/DetailLabel'
import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type DetailRowProps = {
    children: JSX.Element
    label: string
    classes?: {
        root?: string
        label?: string
    }
}

/* 詳細面板的標籤列：固定 74px 的標籤欄，右邊自己撐 */
export function DetailRow(props: DetailRowProps) {
    return (
        <div class={cn('grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3', props.classes?.root)}>
            <DetailLabel class={props.classes?.label}>{props.label}</DetailLabel>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
