import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type DetailLabelProps = {
    children: JSX.Element
    class?: string | undefined
}

export function DetailLabel(props: DetailLabelProps) {
    return (
        <span class={cn('truncate text-xs leading-none text-fg-muted', props.class)}>
            {props.children}
        </span>
    )
}
