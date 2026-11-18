import { TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type FieldHintTone = 'danger' | 'muted'

type FieldHintProps = {
    children: JSX.Element
    tone?: FieldHintTone
    class?: string | undefined
}

/* 欄位底下的一行說明或錯誤。muted 單行截斷；danger 帶警告三角、可換行，原因才讀得完整 */
export function FieldHint(props: FieldHintProps) {
    return (
        <Show
            when={props.tone === 'danger'}
            fallback={<p class={cn('m-0 min-w-0 truncate text-xs text-fg-muted', props.class)}>{props.children}</p>}
        >
            <p class={cn('m-0 flex min-w-0 items-start gap-1.5 text-xs leading-4 text-danger-fg', props.class)}>
                <TriangleAlert
                    size={12}
                    strokeWidth={2}
                    class='mt-0.5 shrink-0'
                />
                <span class='min-w-0'>{props.children}</span>
            </p>
        </Show>
    )
}
