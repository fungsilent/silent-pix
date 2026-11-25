import { Popover as ArkPopover } from '@ark-ui/solid'
import { Portal } from 'solid-js/web'

import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type PopoverProps = {
    trigger: JSX.Element
    children: JSX.Element
    open?: boolean
    placement?: 'bottom-start' | 'bottom-end'
    classes?: {
        trigger?: string
        content?: string
    }
    onOpenChange?: (open: boolean) => void
}

export function Popover(props: PopoverProps) {
    return (
        <ArkPopover.Root
            open={props.open}
            positioning={{ placement: props.placement ?? 'bottom-start', gutter: 4 }}
            onOpenChange={details => props.onOpenChange?.(details.open)}
        >
            <ArkPopover.Trigger
                class={mergeClasses(
                    'outline-none',
                    props.classes?.trigger,
                )}
            >
                {props.trigger}
            </ArkPopover.Trigger>
            <Portal>
                <ArkPopover.Positioner class='z-50'>
                    <ArkPopover.Content
                        class={mergeClasses(
                            'popover flex max-w-[calc(100vw-2rem)] flex-col rounded-md border border-line bg-elevated p-1 shadow-popover outline-none',
                            props.classes?.content,
                        )}
                    >
                        {props.children}
                    </ArkPopover.Content>
                </ArkPopover.Positioner>
            </Portal>
        </ArkPopover.Root>
    )
}
