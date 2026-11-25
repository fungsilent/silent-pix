import { TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type FieldHintTone = 'danger' | 'muted'

type FieldHintProps = {
    children: JSX.Element
    tone?: FieldHintTone
    class?: string | undefined
}

export function FieldHint(props: FieldHintProps) {
    return (
        <Show
            when={props.tone === 'danger'}
            fallback={<p class={mergeClasses('m-0 min-w-0 truncate text-xs text-fg-muted', props.class)}>{props.children}</p>}
        >
            <p class={mergeClasses('m-0 flex min-w-0 items-start gap-1.5 text-xs leading-4 text-fg', props.class)}>
                <TriangleAlert
                    size={12}
                    strokeWidth={2}
                    class='mt-0.5 shrink-0 text-danger-fg'
                />
                <span class='min-w-0'>{props.children}</span>
            </p>
        </Show>
    )
}
