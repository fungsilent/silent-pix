import { Show } from 'solid-js'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type DetailGroupProps = {
    children: JSX.Element
    title?: string
    classes?: {
        root?: string
    }
}

export function DetailGroup(props: DetailGroupProps) {
    return (
        <div class={cn('flex flex-col gap-3', props.classes?.root)}>
            <Show when={props.title}>
                {title => (
                    <h4 class='m-0 text-xs font-semibold leading-none text-fg-secondary'>
                        {title()}
                    </h4>
                )}
            </Show>
            {props.children}
        </div>
    )
}
