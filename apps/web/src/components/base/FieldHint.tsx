import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type FieldHintTone = 'danger' | 'muted'

type FieldHintProps = {
    children: JSX.Element
    tone?: FieldHintTone
    class?: string | undefined
}

const toneClass: Record<FieldHintTone, string> = {
    danger: 'text-danger-fg',
    muted: 'text-fg-muted',
}

/* 欄位底下的一行說明或錯誤。tone 只有兩種，免得每處各自挑顏色 */
export function FieldHint(props: FieldHintProps) {
    return (
        <p class={cn('m-0 min-w-0 truncate text-xs', toneClass[props.tone ?? 'muted'], props.class)}>
            {props.children}
        </p>
    )
}
