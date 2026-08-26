import { Show } from 'solid-js'

import { DetailTitle } from '#/components/detail/DetailTitle'
import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type DetailSectionProps = {
    children: JSX.Element
    title?: string
    count?: number | undefined
    classes?: {
        root?: string
    }
}

export function DetailSection(props: DetailSectionProps) {
    return (
        <section class={cn('flex flex-col gap-3', props.classes?.root)}>
            <Show when={props.title}>
                {title => (
                    <div class='flex flex-col gap-1 py-1'>
                        <DetailTitle count={props.count}>{title()}</DetailTitle>
                    </div>
                )}
            </Show>
            {props.children}
        </section>
    )
}
