import { TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type CalloutProps = {
    variant?: 'box' | 'attached'
    title?: string | undefined
    children: JSX.Element
    class?: string | undefined
}

export function Callout(props: CalloutProps) {
    const attached = () => props.variant === 'attached'

    return (
        <div
            class={mergeClasses(
                'flex min-w-0 items-start gap-2 break-words border-danger/25 bg-danger-soft text-left text-xs leading-4',
                attached() ? 'shrink-0 border-t px-4 py-2' : 'rounded-md border px-3 py-2.5',
                props.class,
            )}
        >
            <TriangleAlert
                size={attached() ? 12 : 14}
                strokeWidth={2}
                class={mergeClasses('shrink-0 text-danger-fg', attached() ? 'mt-0.5' : 'mt-px')}
            />
            <div class='min-w-0'>
                <Show
                    when={props.title}
                    fallback={<p class='m-0 text-fg'>{props.children}</p>}
                >
                    {title => (
                        <>
                            <p class='m-0 font-medium text-fg'>{title()}</p>
                            <p class='m-0 mt-0.5 text-fg-secondary'>{props.children}</p>
                        </>
                    )}
                </Show>
            </div>
        </div>
    )
}
