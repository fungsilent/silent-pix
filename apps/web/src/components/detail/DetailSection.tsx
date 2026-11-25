import { Show } from 'solid-js'

import { DetailTitle } from '#/components/detail/DetailTitle'
import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type DetailSectionProps = {
    children: JSX.Element
    title?: string
    count?: number | undefined
    inert?: boolean
    classes?: {
        root?: string
    }
}

export function DetailSection(props: DetailSectionProps) {
    return (
        <section class={mergeClasses('flex flex-col gap-3', props.classes?.root)}>
            <Show when={props.title}>
                {title => (
                    <div class='flex flex-col gap-1 py-1'>
                        <DetailTitle count={props.count}>{title()}</DetailTitle>
                    </div>
                )}
            </Show>
            <div
                class='contents'
                inert={props.inert}
            >
                {props.children}
            </div>
        </section>
    )
}
