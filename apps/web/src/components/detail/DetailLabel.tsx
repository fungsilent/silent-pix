import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type DetailLabelProps = {
    children: JSX.Element
    class?: string | undefined
}

export function DetailLabel(props: DetailLabelProps) {
    return (
        <span class={mergeClasses('truncate text-xs leading-none text-fg-muted', props.class)}>
            {props.children}
        </span>
    )
}
