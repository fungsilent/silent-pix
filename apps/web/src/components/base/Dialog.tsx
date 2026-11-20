import { Dialog as ArkDialog } from '@ark-ui/solid'
import { X } from 'lucide-solid'
import { createEffect, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Callout } from '#/components/base/Callout'
import { cn } from '#/lib/cn'
import { overlayRoot } from '#/lib/overlayRoot'
import { overlayStore } from '#/store/overlay'

import type { OverlayId } from '#/store/overlay'
import type { JSX } from 'solid-js'

type DialogProps = {
    open: boolean
    title: string
    description?: string
    children: JSX.Element
    footer?: JSX.Element
    error?: string | undefined
    closeDisabled?: boolean
    onOpenChange: (open: boolean) => void
    classes?: {
        backdrop?: string
        positioner?: string
        content?: string
        header?: string
        body?: string
        footer?: string
    }
}

export function Dialog(props: DialogProps) {
    let overlayId: OverlayId | undefined

    createEffect(() => {
        if (props.open && !overlayId) {
            overlayId = overlayStore.open()
            return
        }

        if (!props.open && overlayId) {
            overlayStore.close(overlayId)
            overlayId = undefined
        }
    })

    onCleanup(() => {
        if (overlayId) {
            overlayStore.close(overlayId)
        }
    })

    return (
        <ArkDialog.Root
            open={props.open}
            closeOnEscape={!props.closeDisabled}
            closeOnInteractOutside={!props.closeDisabled}
            onOpenChange={details => props.onOpenChange(details.open)}
        >
            <Portal mount={overlayRoot()}>
                <ArkDialog.Backdrop
                    class={cn(
                        'pointer-events-auto absolute inset-0 z-40 bg-backdrop',
                        props.classes?.backdrop,
                    )}
                />
                <ArkDialog.Positioner
                    class={cn(
                        'pointer-events-auto absolute inset-0 z-50 flex max-h-full items-center justify-center overflow-y-auto p-4',
                        props.classes?.positioner,
                    )}
                >
                    <ArkDialog.Content
                        class={cn(
                            'flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-surface text-fg-secondary shadow-2xl outline-none',
                            props.classes?.content,
                        )}
                    >
                        <div
                            class={cn(
                                'flex shrink-0 items-start justify-between gap-4 border-b border-line-subtle px-4 py-3',
                                props.classes?.header,
                            )}
                        >
                            <div class='min-w-0'>
                                <ArkDialog.Title class='m-0 text-base font-bold leading-tight text-fg'>
                                    {props.title}
                                </ArkDialog.Title>
                                {props.description && (
                                    <ArkDialog.Description class='mt-1 text-xs leading-5 text-fg-muted'>
                                        {props.description}
                                    </ArkDialog.Description>
                                )}
                            </div>
                            <ArkDialog.CloseTrigger
                                disabled={props.closeDisabled}
                                class='flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-elevated text-fg-secondary outline-none hover:bg-elevated-hover focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60'
                            >
                                <X
                                    size={15}
                                    strokeWidth={2}
                                />
                            </ArkDialog.CloseTrigger>
                        </div>
                        <div
                            class={cn(
                                'min-h-0 flex-1 overflow-y-auto p-4',
                                props.classes?.body,
                            )}
                        >
                            {props.children}
                        </div>
                        <Show when={props.error}>
                            {message => <Callout variant='attached'>{message()}</Callout>}
                        </Show>
                        {props.footer && (
                            <div
                                class={cn(
                                    'flex shrink-0 justify-end gap-2 border-t border-line-subtle px-4 py-3',
                                    props.classes?.footer,
                                )}
                            >
                                {props.footer}
                            </div>
                        )}
                    </ArkDialog.Content>
                </ArkDialog.Positioner>
            </Portal>
        </ArkDialog.Root>
    )
}
